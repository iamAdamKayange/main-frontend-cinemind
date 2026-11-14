import type {
  ApplyResult,
  AssetInfo,
  Clip,
  EditOperation,
  OperationBatch,
  TimelineDocument,
  Track,
  Transform,
  ValidationError,
} from "./types.ts";

export const MAX_TIMELINE_FRAMES = 30 * 60 * 60 * 4; // 4h @ 30fps
const MIN_GAIN_DB = -60;
const MAX_GAIN_DB = 12;

export type IdGenerator = (prefix: string) => string;

let counter = 0;
export const defaultIdGenerator: IdGenerator = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

export function clipDuration(clip: Clip): number {
  return clip.sourceOutFrames - clip.sourceInFrames;
}

export function clipEnd(clip: Clip): number {
  return clip.timelineStartFrames + clipDuration(clip);
}

/** Evaluate clip transform animation at a clip-relative frame. Values between keys interpolate linearly. */
export function evaluateTransform(clip: Clip, frame: number): Transform {
  const base: Transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, ...clip.transform };
  const keys = [...(clip.transformKeyframes ?? [])].sort((a, b) => a.frame - b.frame);
  if (!keys.length) return base;
  const values = { ...base };
  for (const property of ["x", "y", "scaleX", "scaleY", "opacity"] as const) {
    const points = keys
      .filter((key) => key.values[property] !== undefined)
      .map((key) => ({ frame: key.frame, value: key.values[property]! }));
    if (!points.length) continue;
    let previous = { frame: 0, value: base[property] };
    let next = points[0];
    for (const point of points) {
      if (point.frame <= frame) previous = point;
      else { next = point; break; }
      next = point;
    }
    if (frame >= points[points.length - 1].frame) values[property] = points[points.length - 1].value;
    else if (next.frame <= previous.frame) values[property] = previous.value;
    else {
      const t = Math.max(0, Math.min(1, (frame - previous.frame) / (next.frame - previous.frame)));
      values[property] = previous.value + (next.value - previous.value) * t;
    }
  }
  return { ...base, ...values };
}

export function sequenceDuration(doc: TimelineDocument): number {
  let end = 0;
  for (const t of doc.tracks) for (const c of t.clips) end = Math.max(end, clipEnd(c));
  return end;
}

export function fpsValue(doc: TimelineDocument): number {
  return doc.sequence.fps.num / doc.sequence.fps.den;
}

/** HH:MM:SS:FF timecode for a frame count. */
export function framesToTimecode(frames: number, fps: number): string {
  const f = Math.max(0, Math.round(frames));
  const whole = Math.round(fps);
  const ff = f % whole;
  const totalSec = Math.floor(f / whole);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60) % 60;
  const hh = Math.floor(totalSec / 3600);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(hh)}:${p(mm)}:${p(ss)}:${p(ff)}`;
}

export function findClip(doc: TimelineDocument, clipId: string): { track: Track; clip: Clip; index: number } | null {
  for (const track of doc.tracks) {
    const index = track.clips.findIndex((c) => c.id === clipId);
    if (index >= 0) return { track, clip: track.clips[index], index };
  }
  return null;
}

function trackAccepts(track: Track, asset: AssetInfo | null): boolean {
  if (asset === null) return track.kind === "text";
  if (track.kind === "audio") return asset.kind === "audio";
  if (track.kind === "video") return asset.kind === "video" || asset.kind === "image";
  return false;
}

function overlaps(track: Track, start: number, end: number, ignoreClipId?: string): boolean {
  return track.clips.some(
    (c) => c.id !== ignoreClipId && start < clipEnd(c) && end > c.timelineStartFrames,
  );
}

function sortClips(track: Track) {
  track.clips.sort((a, b) => a.timelineStartFrames - b.timelineStartFrames);
}

/**
 * Validate and apply an operation batch atomically (spec §5.5).
 * The input document is never mutated; on success a new document with version+1 is returned.
 */
export function applyBatch(
  doc: TimelineDocument,
  batch: OperationBatch,
  assets: AssetInfo[],
  newId: IdGenerator = defaultIdGenerator,
): ApplyResult {
  if (batch.expectedVersion !== doc.version) {
    return {
      ok: false,
      errors: [
        {
          index: -1,
          operation: batch.operations[0]?.type ?? "clip.trim",
          code: "STALE_VERSION",
          message: `Expected timeline version ${batch.expectedVersion} but current is ${doc.version}.`,
        },
      ],
    };
  }

  const next: TimelineDocument = structuredClone(doc);
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const errors: ValidationError[] = [];

  batch.operations.forEach((op, index) => {
    const fail = (code: string, message: string) => errors.push({ index, operation: op.type, code, message });
    const err = applyOne(next, op, assetById, newId);
    if (err) fail(err.code, err.message);
  });

  if (errors.length) return { ok: false, errors };
  next.version = doc.version + 1;
  return { ok: true, document: next };
}

function applyOne(
  doc: TimelineDocument,
  op: EditOperation,
  assets: Map<string, AssetInfo>,
  newId: IdGenerator,
): { code: string; message: string } | null {
  const notFound = (what: string, id: string) => ({ code: "NOT_FOUND", message: `${what} ${id} does not exist.` });
  const locked = (t: Track) => ({ code: "TRACK_LOCKED", message: `Track ${t.name} is locked.` });

  switch (op.type) {
    case "clip.trim": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      if (hit.track.locked) return locked(hit.track);
      if (op.sourceInFrames < 0 || op.sourceOutFrames <= op.sourceInFrames)
        return { code: "INVALID_RANGE", message: "Source out must be greater than source in, and in must be ≥ 0." };
      const asset = hit.clip.assetId ? assets.get(hit.clip.assetId) : null;
      if (asset && op.sourceOutFrames > asset.durationFrames)
        return { code: "OUT_OF_MEDIA", message: `Out point exceeds media duration (${asset.durationFrames} frames).` };
      const end = hit.clip.timelineStartFrames + (op.sourceOutFrames - op.sourceInFrames);
      if (overlaps(hit.track, hit.clip.timelineStartFrames, end, hit.clip.id))
        return { code: "OVERLAP", message: "Trimmed clip would overlap another clip." };
      const trimOffset = op.sourceInFrames - hit.clip.sourceInFrames;
      const newDuration = op.sourceOutFrames - op.sourceInFrames;
      hit.clip.sourceInFrames = op.sourceInFrames;
      hit.clip.sourceOutFrames = op.sourceOutFrames;
      hit.clip.transformKeyframes = hit.clip.transformKeyframes
        ?.map((key) => ({ ...key, frame: key.frame - trimOffset }))
        .filter((key) => key.frame >= 0 && key.frame <= newDuration);
      return null;
    }

    case "clip.move": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      const target = doc.tracks.find((t) => t.id === op.trackId);
      if (!target) return notFound("Track", op.trackId);
      if (hit.track.locked) return locked(hit.track);
      if (target.locked) return locked(target);
      if (op.timelineStartFrames < 0) return { code: "INVALID_RANGE", message: "Timeline start must be ≥ 0." };
      const asset = hit.clip.assetId ? assets.get(hit.clip.assetId) ?? null : null;
      if (target.id !== hit.track.id && !trackAccepts(target, asset))
        return { code: "TRACK_KIND", message: `A ${asset?.kind ?? "title"} clip cannot go on a ${target.kind} track.` };
      const end = op.timelineStartFrames + clipDuration(hit.clip);
      if (end > MAX_TIMELINE_FRAMES) return { code: "LIMIT", message: "Clip would exceed the project length limit." };
      if (overlaps(target, op.timelineStartFrames, end, hit.clip.id))
        return { code: "OVERLAP", message: "Clip would overlap another clip on the target track." };
      hit.track.clips.splice(hit.index, 1);
      hit.clip.timelineStartFrames = op.timelineStartFrames;
      target.clips.push(hit.clip);
      sortClips(target);
      return null;
    }

    case "clip.split": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      if (hit.track.locked) return locked(hit.track);
      const { clip } = hit;
      if (op.atTimelineFrame <= clip.timelineStartFrames || op.atTimelineFrame >= clipEnd(clip))
        return { code: "INVALID_RANGE", message: "Split point must fall strictly inside the clip." };
      const offset = op.atTimelineFrame - clip.timelineStartFrames;
      const right: Clip = {
        ...structuredClone(clip),
        id: newId("clip"),
        timelineStartFrames: op.atTimelineFrame,
        sourceInFrames: clip.sourceInFrames + offset,
        fadeInFrames: 0,
        transformKeyframes: clip.transformKeyframes?.filter((k) => k.frame >= offset).map((k) => ({ ...k, frame: k.frame - offset })),
      };
      clip.sourceOutFrames = clip.sourceInFrames + offset;
      clip.fadeOutFrames = 0;
      clip.transformKeyframes = clip.transformKeyframes?.filter((k) => k.frame < offset);
      hit.track.clips.splice(hit.index + 1, 0, right);
      return null;
    }

    case "clip.insert": {
      const asset = assets.get(op.assetId);
      if (!asset) return notFound("Asset", op.assetId);
      const track = doc.tracks.find((t) => t.id === op.trackId);
      if (!track) return notFound("Track", op.trackId);
      if (track.locked) return locked(track);
      if (!trackAccepts(track, asset))
        return { code: "TRACK_KIND", message: `A ${asset.kind} asset cannot go on a ${track.kind} track.` };
      const inF = op.sourceInFrames ?? 0;
      const outF = op.sourceOutFrames ?? asset.durationFrames;
      if (inF < 0 || outF <= inF || outF > asset.durationFrames)
        return { code: "INVALID_RANGE", message: "Invalid source range for asset." };
      if (op.timelineStartFrames < 0) return { code: "INVALID_RANGE", message: "Timeline start must be ≥ 0." };
      const end = op.timelineStartFrames + (outF - inF);
      if (overlaps(track, op.timelineStartFrames, end))
        return { code: "OVERLAP", message: "Inserted clip would overlap another clip." };
      track.clips.push({
        id: newId("clip"),
        assetId: asset.id,
        label: asset.name,
        timelineStartFrames: op.timelineStartFrames,
        sourceInFrames: inF,
        sourceOutFrames: outF,
        ...(track.kind === "audio"
          ? { gainDb: 0, fadeInFrames: 0, fadeOutFrames: 0 }
          : { transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 } }),
      });
      sortClips(track);
      return null;
    }

    case "clip.delete": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      if (hit.track.locked) return locked(hit.track);
      hit.track.clips.splice(hit.index, 1);
      doc.transitions = doc.transitions.filter((t) => t.fromClipId !== op.clipId && t.toClipId !== op.clipId);
      return null;
    }

    case "audio.setGain": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      if (hit.track.kind !== "audio" && hit.track.kind !== "video")
        return { code: "TRACK_KIND", message: "Gain applies to audio or video clips only." };
      if (op.gainDb < MIN_GAIN_DB || op.gainDb > MAX_GAIN_DB)
        return { code: "INVALID_RANGE", message: `Gain must be between ${MIN_GAIN_DB} and ${MAX_GAIN_DB} dB.` };
      hit.clip.gainDb = op.gainDb;
      return null;
    }

    case "audio.setFades": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      const d = clipDuration(hit.clip);
      if (op.fadeInFrames < 0 || op.fadeOutFrames < 0 || op.fadeInFrames + op.fadeOutFrames > d)
        return { code: "INVALID_RANGE", message: "Fades must be ≥ 0 and fit within the clip." };
      hit.clip.fadeInFrames = op.fadeInFrames;
      hit.clip.fadeOutFrames = op.fadeOutFrames;
      return null;
    }

    case "transition.add": {
      const a = findClip(doc, op.fromClipId);
      const b = findClip(doc, op.toClipId);
      if (!a) return notFound("Clip", op.fromClipId);
      if (!b) return notFound("Clip", op.toClipId);
      if (a.track.id !== b.track.id || b.index !== a.index + 1)
        return { code: "NOT_ADJACENT", message: "Transitions need two adjacent clips on the same track." };
      const maxDur = Math.min(clipDuration(a.clip), clipDuration(b.clip));
      if (op.durationFrames <= 0 || op.durationFrames > maxDur)
        return { code: "INVALID_RANGE", message: `Transition duration must be 1–${maxDur} frames.` };
      doc.transitions.push({
        id: newId("tr"),
        fromClipId: op.fromClipId,
        toClipId: op.toClipId,
        kind: op.kind,
        durationFrames: op.durationFrames,
      });
      return null;
    }

    case "clip.setTransform": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      if (hit.track.locked) return locked(hit.track);
      if (hit.track.kind === "audio") return { code: "TRACK_KIND", message: "Audio clips have no transform." };
      const t = { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, ...hit.clip.transform, ...op.transform };
      if (t.opacity < 0 || t.opacity > 1) return { code: "INVALID_RANGE", message: "Opacity must be between 0 and 1." };
      if (t.scaleX <= 0 || t.scaleY <= 0 || t.scaleX > 10 || t.scaleY > 10)
        return { code: "INVALID_RANGE", message: "Scale must be between 0 and 10." };
      if (t.crop) {
        const c = t.crop;
        if ([c.left, c.top, c.right, c.bottom].some((v) => !(v >= 0 && v <= 0.45)))
          return { code: "INVALID_RANGE", message: "Each crop edge must be between 0% and 45%." };
      }
      if (Math.abs(t.x) > doc.sequence.width * 2 || Math.abs(t.y) > doc.sequence.height * 2)
        return { code: "INVALID_RANGE", message: "Position is too far outside the frame." };
      hit.clip.transform = t;
      return null;
    }

    case "clip.setTransformKeyframe": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      if (hit.track.locked) return locked(hit.track);
      if (hit.track.kind === "audio") return { code: "TRACK_KIND", message: "Audio clips have no transform." };
      const { frame, values } = op.keyframe;
      if (!Number.isInteger(frame) || frame < 0 || frame > clipDuration(hit.clip))
        return { code: "INVALID_RANGE", message: "Keyframe must fall within the clip." };
      const inR = (v: number | undefined, min: number, max: number) => v === undefined || (Number.isFinite(v) && v >= min && v <= max);
      if (!inR(values.x, -doc.sequence.width * 2, doc.sequence.width * 2) || !inR(values.y, -doc.sequence.height * 2, doc.sequence.height * 2) || !inR(values.scaleX, 0.01, 10) || !inR(values.scaleY, 0.01, 10) || !inR(values.opacity, 0, 1))
        return { code: "INVALID_RANGE", message: "Transform keyframe values are out of range." };
      const keys = (hit.clip.transformKeyframes ?? []).filter((k) => k.frame !== frame);
      keys.push(structuredClone(op.keyframe));
      hit.clip.transformKeyframes = keys.sort((a, b) => a.frame - b.frame);
      return null;
    }

    case "clip.removeTransformKeyframe": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      if (hit.track.locked) return locked(hit.track);
      const keys = hit.clip.transformKeyframes ?? [];
      const remaining = keys.filter((k) => k.frame !== op.frame);
      if (remaining.length === keys.length) return { code: "NOT_FOUND", message: "Transform keyframe does not exist." };
      hit.clip.transformKeyframes = remaining.length ? remaining : undefined;
      return null;
    }

    case "clip.setEffects": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      if (hit.track.locked) return locked(hit.track);
      const fx = { ...hit.clip.fx, ...op.fx };
      const inR = (v: number | undefined, a: number, b: number) => v === undefined || (Number.isFinite(v) && v >= a && v <= b);
      if (!inR(fx.brightness, -1, 1) || !inR(fx.contrast, 0, 2) || !inR(fx.saturation, 0, 3) || !inR(fx.blur, 0, 20) || !inR(fx.sharpen, 0, 5) || !inR(fx.vignette, 0, 1) || !inR(fx.bass, -12, 12) || !inR(fx.mid, -12, 12) || !inR(fx.treble, -12, 12) || !inR(fx.stereoPan, -1, 1) || !inR(fx.pitchSemitones, -12, 12))
        return { code: "INVALID_RANGE", message: "An effect value is out of range." };
      if (fx.look && !["none", "bw", "vintage", "warm", "cool", "cinematic"].includes(fx.look)) return { code: "INVALID_RANGE", message: "Unknown look." };
      if (fx.voicePreset && !["natural", "deep", "bright", "telephone", "radio", "robot"].includes(fx.voicePreset)) return { code: "INVALID_RANGE", message: "Unknown voice preset." };
      hit.clip.fx = fx;
      return null;
    }

    case "sequence.update": {
      const ok = (n: number) => Number.isInteger(n) && n >= 144 && n <= 7680 && n % 2 === 0;
      if (!ok(op.width) || !ok(op.height)) return { code: "INVALID_RANGE", message: "Frame size must be even and between 144 and 7680 pixels." };
      doc.sequence.width = op.width;
      doc.sequence.height = op.height;
      return null;
    }

    case "title.update": {
      const hit = findClip(doc, op.clipId);
      if (!hit) return notFound("Clip", op.clipId);
      if (hit.track.kind !== "text") return { code: "TRACK_KIND", message: "Only titles have text." };
      if (hit.track.locked) return locked(hit.track);
      const text = op.text.trim();
      if (!text) return { code: "EMPTY_TEXT", message: "Title text is empty." };
      if (text.length > 200) return { code: "LIMIT", message: "Titles are limited to 200 characters." };
      hit.clip.text = text;
      hit.clip.label = text;
      return null;
    }

    case "transition.remove": {
      const before = doc.transitions.length;
      doc.transitions = doc.transitions.filter((t) => t.id !== op.transitionId);
      return before === doc.transitions.length ? notFound("Transition", op.transitionId) : null;
    }

    case "track.update": {
      const track = doc.tracks.find((t) => t.id === op.trackId);
      if (!track) return notFound("Track", op.trackId);
      if (op.muted !== undefined) track.muted = op.muted;
      if (op.locked !== undefined) track.locked = op.locked;
      if (op.hidden !== undefined) track.hidden = op.hidden;
      return null;
    }

    case "title.add": {
      const track = doc.tracks.find((t) => t.id === op.trackId);
      if (!track) return notFound("Track", op.trackId);
      if (track.kind !== "text") return { code: "TRACK_KIND", message: "Titles go on a text track." };
      if (track.locked) return locked(track);
      if (!op.text.trim()) return { code: "EMPTY_TEXT", message: "Title text is empty." };
      if (op.startFrame < 0 || op.durationFrames <= 0)
        return { code: "INVALID_RANGE", message: "Title timing is invalid." };
      if (overlaps(track, op.startFrame, op.startFrame + op.durationFrames))
        return { code: "OVERLAP", message: "Title would overlap another title." };
      track.clips.push({
        id: newId("title"),
        assetId: null,
        text: op.text,
        label: op.text,
        timelineStartFrames: op.startFrame,
        sourceInFrames: 0,
        sourceOutFrames: op.durationFrames,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
      });
      sortClips(track);
      return null;
    }
  }
}

/** Human-readable one-line summary of an operation, used by the AI approval UI. */
export function describeOperation(op: EditOperation, fps: number, labelOf: (clipId: string) => string): string {
  const s = (f: number) => `${(f / fps).toFixed(1)}s`;
  switch (op.type) {
    case "clip.trim":
      return `Trim ${labelOf(op.clipId)} to ${s(op.sourceOutFrames - op.sourceInFrames)} (in ${s(op.sourceInFrames)})`;
    case "clip.move":
      return `Move ${labelOf(op.clipId)} to ${s(op.timelineStartFrames)}`;
    case "clip.split":
      return `Split ${labelOf(op.clipId)} at ${s(op.atTimelineFrame)}`;
    case "clip.insert":
      return `Insert ${labelOf(op.assetId)} at ${s(op.timelineStartFrames)}${op.sourceOutFrames !== undefined ? ` (${s(op.sourceOutFrames - (op.sourceInFrames ?? 0))})` : ""}`;
    case "clip.delete":
      return `Delete ${labelOf(op.clipId)}`;
    case "audio.setGain":
      return `Set ${labelOf(op.clipId)} gain to ${op.gainDb} dB`;
    case "audio.setFades":
      return `Fade ${labelOf(op.clipId)}: in ${s(op.fadeInFrames)}, out ${s(op.fadeOutFrames)}`;
    case "transition.add":
      return `Add ${op.kind} (${s(op.durationFrames)}) between ${labelOf(op.fromClipId)} and ${labelOf(op.toClipId)}`;
    case "title.add":
      return `Add title “${op.text}” at ${s(op.startFrame)} for ${s(op.durationFrames)}`;
    case "clip.setTransform":
      return `Adjust transform of ${labelOf(op.clipId)}`;
    case "clip.setTransformKeyframe":
      return `Add transform keyframe at ${s(op.keyframe.frame)} on ${labelOf(op.clipId)}`;
    case "clip.removeTransformKeyframe":
      return `Remove transform keyframe at ${s(op.frame)} on ${labelOf(op.clipId)}`;
    case "track.update":
      return `Update track ${op.trackId}`;
    case "title.update":
      return `Change title text to “${op.text}”`;
    case "sequence.update":
      return `Change frame to ${op.width}×${op.height}`;
    case "clip.setEffects":
      return `Apply effects to ${labelOf(op.clipId)}: ${Object.entries(op.fx).map(([k, v]) => (v === true ? k : `${k} ${v}`)).join(", ")}`;
    case "transition.remove":
      return "Remove transition";
  }
}
