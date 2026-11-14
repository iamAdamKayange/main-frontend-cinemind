import { clipDuration, clipEnd, sequenceDuration } from "./engine.ts";
import type { AssetInfo, Clip, EditOperation, TimelineDocument } from "./types.ts";

/** Frames per second of the sequence being planned (set at the start of plan()). */
let FPS = 30;

/**
 * Rule-based planner.
 *
 * Used when no AI provider key is configured (and as a fast path for simple commands):
 * it turns a small set of plain-language requests into the same typed EditOperations
 * that Claude / OpenAI / Gemini tool calls will produce. It never applies anything itself.
 */
export interface PlanResult {
  reply: string;
  operations: EditOperation[];
}

const ORDINALS: Record<string, number> = {
  first: 1, one: 1, "1": 1, "1st": 1,
  second: 2, two: 2, "2": 2, "2nd": 2,
  third: 3, three: 3, "3": 3, "3rd": 3,
  fourth: 4, four: 4, "4": 4, "4th": 4,
  fifth: 5, five: 5, "5": 5, "5th": 5,
};

function videoClips(doc: TimelineDocument): Clip[] {
  return doc.tracks
    .filter((t) => t.kind === "video")
    .flatMap((t) => t.clips)
    .sort((a, b) => a.timelineStartFrames - b.timelineStartFrames);
}

function audioClips(doc: TimelineDocument): Clip[] {
  return doc.tracks.filter((t) => t.kind === "audio").flatMap((t) => t.clips);
}

/** Resolve "first clip", "clip 2", "the last clip" or an asset name to a clip. */
function resolveClip(ref: string, doc: TimelineDocument, selected: string | null): Clip | null {
  const clips = videoClips(doc);
  const r = ref.toLowerCase().trim();
  if (/\b(this|selected|current)\b/.test(r) && selected) return clips.find((c) => c.id === selected) ?? null;
  if (/\blast\b/.test(r)) return clips[clips.length - 1] ?? null;
  const m = r.match(/\b(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|one|two|three|four|five|\d+)\b/);
  if (m) return clips[(ORDINALS[m[1]] ?? Number(m[1])) - 1] ?? null;
  return clips.find((c) => (c.label ?? "").toLowerCase().includes(r)) ?? null;
}

const num = (s: string) => Number(s.replace(",", "."));

/**
 * Emit clip.move ops in an order where every intermediate state is overlap-free
 * (the engine validates each op in sequence). Mutates `work` to the final layout.
 */
function orderMoves(work: TimelineDocument, trackId: string, moving: Clip, finals: Map<string, number>): EditOperation[] {
  const track = work.tracks.find((t) => t.id === trackId)!;
  // A clip coming from another track joins this one.
  if (!track.clips.includes(moving)) {
    for (const t of work.tracks) t.clips = t.clips.filter((c) => c.id !== moving.id);
    moving.timelineStartFrames = -1e9; // off-track until placed
    track.clips.push(moving);
  }
  const ops: EditOperation[] = [];
  const pending = new Map(finals);
  const fits = (c: Clip, start: number) =>
    start >= 0 &&
    !track.clips.some((o) => o.id !== c.id && o.timelineStartFrames >= 0 && start < clipEnd(o) && start + clipDuration(c) > o.timelineStartFrames);
  let guard = 0;
  let parked = false;
  while (pending.size && guard++ < 50) {
    let progressed = false;
    for (const [id, start] of pending) {
      const c = track.clips.find((x) => x.id === id)!;
      if (fits(c, start)) {
        ops.push({ type: "clip.move", clipId: id, trackId, timelineStartFrames: start });
        c.timelineStartFrames = start;
        pending.delete(id);
        progressed = true;
      }
    }
    if (!progressed) {
      if (parked) break;
      parked = true;
      // Park the moving clip past the end to free its old slot, then retry.
      const park = Math.max(...track.clips.map(clipEnd)) + FPS;
      ops.push({ type: "clip.move", clipId: moving.id, trackId, timelineStartFrames: park });
      moving.timelineStartFrames = park;
    }
  }
  return ops;
}

export function plan(
  prompt: string,
  doc: TimelineDocument,
  assets: AssetInfo[],
  ctx: { selectedClipId: string | null; playhead: number },
): PlanResult {
  FPS = Math.round(doc.sequence.fps.num / doc.sequence.fps.den);
  const ops: EditOperation[] = [];
  const notes: string[] = [];
  // Work on a scratch copy so later steps see earlier ones (e.g. trim then place after).
  const work: TimelineDocument = structuredClone(doc);
  const sentences = prompt
    .split(/(?<=[.;!?])\s+|\s*,\s*(?:then|and then)\s+|\s+and then\s+|\s*,?\s+and\s+(?=(?:add|fade|trim|place|put|move|use|keep|split|delete|remove|set|lower|raise|make)\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const raw of sentences) {
    const s = raw.toLowerCase();
    let m: RegExpMatchArray | null;

    // Trim: "trim the first clip to 12 seconds"
    if ((m = s.match(/(?:trim|cut|shorten)\s+(?:the\s+)?(.+?)\s+(?:clip\s+)?to\s+(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds)\b/))) {
      const clip = resolveClip(m[1].replace(/\bclip\b/, ""), work, ctx.selectedClipId);
      if (!clip) { notes.push(`I couldn't find “${m[1]}”.`); continue; }
      const frames = Math.round(num(m[2]) * FPS);
      const op: EditOperation = { type: "clip.trim", clipId: clip.id, sourceInFrames: clip.sourceInFrames, sourceOutFrames: clip.sourceInFrames + frames };
      ops.push(op);
      clip.sourceOutFrames = op.sourceOutFrames;
      continue;
    }

    // Place after: "place the second clip after the first"
    if ((m = s.match(/(?:place|put|move|use)\s+(?:the\s+)?(.+?)\s+(?:clip\s+)?(?:right\s+)?after\s+(?:the\s+)?(.+?)(?:\s+clip)?$/))) {
      const a = resolveClip(m[1].replace(/\bclip\b/, ""), work, ctx.selectedClipId);
      const b = resolveClip(m[2].replace(/\bclip\b/, ""), work, ctx.selectedClipId);
      if (!a || !b || a.id === b.id) { notes.push("I couldn't tell which two clips you meant."); continue; }
      const track = work.tracks.find((t) => t.clips.some((c) => c.id === b.id))!;
      // Final layout: A sits right after B; later clips are pushed right only as far as needed.
      const finals = new Map<string, number>([[a.id, clipEnd(b)]]);
      let cursor = clipEnd(b) + clipDuration(a);
      for (const c of track.clips
        .filter((c) => c.id !== a.id && c.id !== b.id && c.timelineStartFrames >= b.timelineStartFrames)
        .sort((x, y) => x.timelineStartFrames - y.timelineStartFrames)) {
        const start = Math.max(c.timelineStartFrames, cursor);
        if (start !== c.timelineStartFrames) finals.set(c.id, start);
        cursor = start + clipDuration(c);
      }
      ops.push(...orderMoves(work, track.id, a, finals));
      continue;
    }

    // Fades: "fade out the audio over 2 seconds", "fade the song in"
    if ((m = s.match(/fade\s+(?:the\s+)?(?:(audio|song|music|soundtrack)\s+)?(in|out)(?:\s+(?:the\s+)?(?:audio|song|music|soundtrack))?(?:.*?(\d+(?:[.,]\d+)?)\s*(?:s|sec|seconds))?/)) || (m = s.match(/fade\s+(?:the\s+)?(audio|song|music|soundtrack)\s+(?:at the end|out)/))) {
      const dir = m[2] === "in" ? "in" : "out";
      const secs = m[3] ? num(m[3]) : 2;
      const targets = audioClips(work);
      if (!targets.length) { notes.push("There is no audio on the timeline to fade."); continue; }
      for (const c of targets) {
        const f = Math.min(Math.round(secs * FPS), clipDuration(c));
        const fadeIn = dir === "in" ? f : c.fadeInFrames ?? 0;
        const fadeOut = dir === "out" ? f : c.fadeOutFrames ?? 0;
        ops.push({ type: "audio.setFades", clipId: c.id, fadeInFrames: fadeIn, fadeOutFrames: Math.min(fadeOut, clipDuration(c) - fadeIn) });
        c.fadeInFrames = fadeIn;
        c.fadeOutFrames = fadeOut;
      }
      continue;
    }

    // Gain: "lower the music to -6 dB", "set volume to -3db"
    if ((m = s.match(/(?:volume|gain|lower|raise|set)\b.*?(-?\d+(?:[.,]\d+)?)\s*db/))) {
      for (const c of audioClips(work)) ops.push({ type: "audio.setGain", clipId: c.id, gainDb: num(m[1]) });
      continue;
    }

    // Soundtrack: "use song.wav as the soundtrack", "keep the song as master"
    if ((m = s.match(/(?:use|add|keep)\s+(?:the\s+)?(.+?)\s+as\s+(?:the\s+)?(?:master\s+)?(?:soundtrack|music|master|audio)/))) {
      const name = m[1].replace(/\b(song|music|track)\b/g, "").trim();
      const asset =
        assets.find((a) => a.kind === "audio" && name && a.name.toLowerCase().includes(name)) ??
        assets.find((a) => a.kind === "audio");
      if (!asset) { notes.push("I couldn't find an audio file in the media library."); continue; }
      const existing = audioClips(work).find((c) => c.assetId === asset.id);
      const length = Math.max(sequenceDuration(work), FPS);
      if (existing) {
        notes.push(`${asset.name} is already on the timeline — keeping it as the master.`);
        const out = Math.min(asset.durationFrames, existing.sourceInFrames + length);
        if (out !== existing.sourceOutFrames) {
          ops.push({ type: "clip.trim", clipId: existing.id, sourceInFrames: existing.sourceInFrames, sourceOutFrames: out });
          existing.sourceOutFrames = out;
        }
      } else {
        const a1 = work.tracks.find((t) => t.kind === "audio" && t.clips.length === 0) ?? work.tracks.find((t) => t.kind === "audio")!;
        ops.push({ type: "clip.insert", assetId: asset.id, trackId: a1.id, timelineStartFrames: 0, sourceInFrames: 0, sourceOutFrames: Math.min(asset.durationFrames, length) });
      }
      continue;
    }

    // Title: add a title "Hello" (for 3 seconds)
    if ((m = raw.match(/add\s+(?:a\s+)?(?:title|caption|text)\s*(?:saying|that says|:)?\s*["“']?([^"”']+?)["”']?(?:\s+for\s+(\d+(?:[.,]\d+)?)\s*(?:s|sec|seconds))?\s*$/i))) {
      const t1 = work.tracks.find((t) => t.kind === "text");
      if (!t1) { notes.push("This project has no text track."); continue; }
      const dur = Math.round((m[2] ? num(m[2]) : 3) * FPS);
      let start = ctx.playhead;
      while (t1.clips.some((c) => start < clipEnd(c) && start + dur > c.timelineStartFrames)) {
        start = Math.max(...t1.clips.filter((c) => start < clipEnd(c)).map(clipEnd));
      }
      ops.push({ type: "title.add", trackId: t1.id, text: m[1].trim(), startFrame: start, durationFrames: dur });
      t1.clips.push({ id: `pending_${ops.length}`, assetId: null, timelineStartFrames: start, sourceInFrames: 0, sourceOutFrames: dur });
      continue;
    }

    // Transition: "add a dissolve between clip 1 and clip 2"
    if ((m = s.match(/(dissolve|fade|dip to black|crossfade|transition)\s+between\s+(?:the\s+)?(.+?)\s+and\s+(?:the\s+)?(.+)$/))) {
      const a = resolveClip(m[2].replace(/\bclip\b/, ""), work, ctx.selectedClipId);
      const b = resolveClip(m[3].replace(/\bclip\b/, ""), work, ctx.selectedClipId);
      if (!a || !b) { notes.push("I couldn't find both clips for the transition."); continue; }
      const kind = m[1] === "dip to black" ? "dip-to-black" : m[1] === "fade" ? "fade" : "dissolve";
      ops.push({ type: "transition.add", fromClipId: a.id, toClipId: b.id, kind, durationFrames: 12 });
      continue;
    }

    // Split: "split at the playhead"
    if (/\bsplit\b/.test(s)) {
      const clip = videoClips(work).find((c) => ctx.playhead > c.timelineStartFrames && ctx.playhead < clipEnd(c));
      if (!clip) { notes.push("Move the playhead over a video clip to split it."); continue; }
      ops.push({ type: "clip.split", clipId: clip.id, atTimelineFrame: ctx.playhead });
      continue;
    }

    // Delete: "delete the last clip"
    if ((m = s.match(/(?:delete|remove)\s+(?:the\s+)?(.+)$/))) {
      const clip = resolveClip(m[1].replace(/\bclip\b/, ""), work, ctx.selectedClipId);
      if (!clip) { notes.push(`I couldn't find “${m[1]}”.`); continue; }
      ops.push({ type: "clip.delete", clipId: clip.id });
      continue;
    }

    notes.push(`I didn't understand “${raw}”.`);
  }

  if (!ops.length) {
    return {
      reply:
        (notes.length ? notes.join(" ") + " " : "") +
        "Offline mode understands requests like: “trim the first clip to 12 seconds”, “place the third clip after the first”, “fade out the audio over 3 seconds”, “add a title \"Chorus\"”, “use midnight-signals as the soundtrack”, “split at the playhead”.",
      operations: [],
    };
  }

  return {
    reply:
      `Here's my plan — ${ops.length} change${ops.length > 1 ? "s" : ""}. Nothing is applied until you approve.` +
      (notes.length ? ` Note: ${notes.join(" ")}` : ""),
    operations: ops,
  };
}
