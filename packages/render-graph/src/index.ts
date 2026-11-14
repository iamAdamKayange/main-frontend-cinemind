import { clipDuration, clipEnd, sequenceDuration, type ClipEffects, type TimelineDocument } from "@cinemind/timeline-engine";

export interface RenderPreset {
  id: string;
  name: string;
  width: number | null; // null = sequence size
  height: number | null;
  crf: number;
  x264preset: string;
  audioBitrate: string;
}

export const PRESETS: Record<string, RenderPreset> = {
  yt1080: { id: "yt1080", name: "YouTube 1080p", width: 1920, height: 1080, crf: 20, x264preset: "veryfast", audioBitrate: "192k" },
  vertical: { id: "vertical", name: "Vertical social", width: 1080, height: 1920, crf: 21, x264preset: "veryfast", audioBitrate: "160k" },
  square: { id: "square", name: "Square social", width: 1080, height: 1080, crf: 21, x264preset: "veryfast", audioBitrate: "160k" },
  master: { id: "master", name: "High-quality master", width: null, height: null, crf: 15, x264preset: "slow", audioBitrate: "320k" },
  draft: { id: "draft", name: "Quick draft 540p", width: 960, height: 540, crf: 28, x264preset: "ultrafast", audioBitrate: "128k" },
};

export interface RenderAsset {
  id: string;
  kind: "video" | "audio" | "image";
  path: string;
  hasAudio: boolean;
}

function keyframeExpr(clip: TimelineDocument["tracks"][number]["clips"][number], property: "x" | "y" | "scaleX" | "scaleY" | "opacity", base: number, clock: string): string {
  const points = [{ frame: 0, value: base }];
  for (const key of [...(clip.transformKeyframes ?? [])].sort((a, b) => a.frame - b.frame)) {
    const value = key.values[property];
    if (value === undefined) continue;
    const existing = points.findIndex((point) => point.frame === key.frame);
    if (existing >= 0) points[existing] = { frame: key.frame, value };
    else points.push({ frame: key.frame, value });
  }
  points.sort((a, b) => a.frame - b.frame);
  if (points.length === 1) return String(base);
  let expression = String(points[points.length - 1].value);
  for (let i = points.length - 1; i > 0; i--) {
    const from = points[i - 1];
    const to = points[i];
    const linear = `${n3(from.value)}+(${n3(to.value)}-${n3(from.value)})*(${clock}-${from.frame})/${to.frame - from.frame}`;
    expression = `if(lt(${clock},${to.frame}),${linear},${expression})`;
  }
  return expression.replaceAll(",", "\\,");
}

/** Escape a value for use inside an FFmpeg filter option. */
const fe = (s: string) => s.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
const n3 = (x: number) => Number(x.toFixed(3));

/**
 * Turn a frozen timeline version into an FFmpeg argument array (spec §10.1).
 * Titles are read from text files in `workDir` (written by the caller) to avoid escaping user text.
 */
export function buildRenderArgs(
  doc: TimelineDocument,
  assets: Map<string, RenderAsset>,
  preset: RenderPreset,
  output: string,
  fontFile: string,
): { args: string[]; titles: Array<{ file: string; text: string }>; totalSec: number } {
  const fps = doc.sequence.fps.num / doc.sequence.fps.den;
  const W = preset.width ?? doc.sequence.width;
  const H = preset.height ?? doc.sequence.height;
  const totalFrames = Math.max(1, sequenceDuration(doc));
  const total = n3(totalFrames / fps);
  const sec = (f: number) => n3(f / fps);

  const args: string[] = ["-y", "-v", "error", "-nostats", "-progress", "pipe:1"];
  const filters: string[] = [];
  let input = 0;

  filters.push(`color=c=black:s=${W}x${H}:r=${fps}:d=${total},format=yuv420p[base0]`);
  let baseIdx = 0;

  const audioLabels: string[] = [];
  const transitionsByClip = new Map<string, { in?: number; out?: number }>();
  for (const tr of doc.transitions) {
    const half = tr.durationFrames / 2;
    transitionsByClip.set(tr.fromClipId, { ...transitionsByClip.get(tr.fromClipId), out: half });
    transitionsByClip.set(tr.toClipId, { ...transitionsByClip.get(tr.toClipId), in: half });
  }

  const videoTracks = doc.tracks.filter((t) => t.kind === "video" && !t.hidden).sort((a, b) => a.order - b.order);
  for (const track of videoTracks) {
    for (const clip of track.clips) {
      const asset = clip.assetId ? assets.get(clip.assetId) : undefined;
      if (!asset) continue;
      const start = sec(clip.timelineStartFrames);
      const dur = sec(clipDuration(clip));
      const end = sec(clipEnd(clip));
      if (asset.kind === "image") args.push("-loop", "1", "-t", String(dur), "-i", asset.path);
      else args.push("-ss", String(sec(clip.sourceInFrames)), "-t", String(dur), "-i", asset.path);
      const i = input++;
      const t = clip.transform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
      const sx = keyframeExpr(clip, "scaleX", t.scaleX, "n");
      const sy = keyframeExpr(clip, "scaleY", t.scaleY, "n");
      const sw = `trunc(${W}*(${sx})/2)*2`;
      const sh = `trunc(${H}*(${sy})/2)*2`;
      const chain: string[] = [];
      const c = t.crop;
      if (c && c.left + c.right + c.top + c.bottom > 0) {
        chain.push(`crop=trunc(iw*${n3(1 - c.left - c.right)}/2)*2:trunc(ih*${n3(1 - c.top - c.bottom)}/2)*2:iw*${n3(c.left)}:ih*${n3(c.top)}`);
      }
      if (t.fit === "fill") chain.push(`scale=${sw}:${sh}:force_original_aspect_ratio=increase:eval=frame`, `crop=${sw}:${sh}:eval=frame`);
      else chain.push(`scale=${sw}:${sh}:force_original_aspect_ratio=decrease:eval=frame`);
      chain.push(...videoFx(clip.fx));
      chain.push(
        "setsar=1",
        `fps=${fps}`,
        "format=yuva420p",
      );
      const opacity = keyframeExpr(clip, "opacity", t.opacity, "n");
      if (t.opacity < 1 || clip.transformKeyframes?.some((key) => key.values.opacity !== undefined)) chain.push(`colorchannelmixer=aa=${opacity}:eval=frame`);
      const tr = transitionsByClip.get(clip.id);
      if (tr?.in) chain.push(`fade=t=in:st=0:d=${sec(tr.in)}:alpha=1`);
      if (tr?.out) chain.push(`fade=t=out:st=${n3(dur - sec(tr.out))}:d=${sec(tr.out)}:alpha=1`);
      chain.push(`setpts=PTS-STARTPTS+${start}/TB`);
      filters.push(`[${i}:v]${chain.join(",")}[v${i}]`);
      const localFrame = `(n-${clip.timelineStartFrames})`;
      const ox = `(W-w)/2+${keyframeExpr(clip, "x", t.x, localFrame)}`;
      const oy = `(H-h)/2+${keyframeExpr(clip, "y", t.y, localFrame)}`;
      filters.push(`[base${baseIdx}][v${i}]overlay=x=${ox}:y=${oy}:eof_action=pass:enable='between(t,${start},${end})'[base${baseIdx + 1}]`);
      baseIdx++;

      if (asset.kind === "video" && asset.hasAudio && !track.muted) {
        audioLabels.push(audioChain(filters, i, clip.gainDb ?? 0, clip.fadeInFrames ?? 0, clip.fadeOutFrames ?? 0, dur, start, fps, clip.fx));
      }
    }
  }

  for (const track of doc.tracks.filter((t) => t.kind === "audio" && !t.muted)) {
    for (const clip of track.clips) {
      const asset = clip.assetId ? assets.get(clip.assetId) : undefined;
      if (!asset || asset.kind === "image" || (asset.kind === "video" && !asset.hasAudio)) continue;
      const dur = sec(clipDuration(clip));
      args.push("-ss", String(sec(clip.sourceInFrames)), "-t", String(dur), "-i", asset.path);
      const i = input++;
      audioLabels.push(audioChain(filters, i, clip.gainDb ?? 0, clip.fadeInFrames ?? 0, clip.fadeOutFrames ?? 0, dur, sec(clip.timelineStartFrames), fps, clip.fx));
    }
  }

  // Titles.
  const titles: Array<{ file: string; text: string }> = [];
  let last = `base${baseIdx}`;
  const textClips = doc.tracks.filter((t) => t.kind === "text" && !t.hidden).flatMap((t) => t.clips);
  textClips.forEach((c, k) => {
    const file = `title_${k}.txt`;
    titles.push({ file, text: c.text ?? "" });
    const s = sec(c.timelineStartFrames);
    const e = sec(clipEnd(c));
    const fadeA = `if(lt(t,${s}+0.3),(t-${s})/0.3,if(gt(t,${e}-0.3),(${e}-t)/0.3,1))`;
    filters.push(
      `[${last}]drawtext=fontfile='${fe(fontFile)}':textfile=${file}:fontcolor=white:fontsize=${Math.round(H / 13)}:` +
        `x=(w-text_w)/2:y=h*0.82-text_h:borderw=3:bordercolor=black@0.55:alpha='${fadeA}':enable='between(t,${s},${e})'[t${k}]`,
    );
    last = `t${k}`;
  });
  filters.push(`[${last}]format=yuv420p[vout]`);

  if (audioLabels.length) {
    filters.push(`${audioLabels.map((l) => `[${l}]`).join("")}amix=inputs=${audioLabels.length}:normalize=0:dropout_transition=0,atrim=0:${total},alimiter=limit=0.95[aout]`);
  } else {
    filters.push(`anullsrc=r=48000:cl=stereo,atrim=0:${total}[aout]`);
  }

  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[vout]", "-map", "[aout]",
    "-t", String(total),
    "-r", String(fps),
    "-c:v", "libx264", "-preset", preset.x264preset, "-crf", String(preset.crf), "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", preset.audioBitrate, "-ar", "48000",
    "-movflags", "+faststart",
    output,
  );
  return { args, titles, totalSec: total };
}

/** Visual effects → FFmpeg filters (looks are tuned approximations of common grades). */
export function videoFx(fx: ClipEffects | undefined): string[] {
  if (!fx) return [];
  const out: string[] = [];
  const looks: Record<string, string[]> = {
    bw: ["hue=s=0"],
    vintage: ["curves=preset=vintage"],
    warm: ["colorbalance=rs=0.08:gs=0.02:bs=-0.08:rm=0.05:bm=-0.05"],
    cool: ["colorbalance=rs=-0.06:bs=0.08:rm=-0.04:bm=0.06"],
    cinematic: ["colorbalance=rs=-0.05:bs=0.07:rh=0.07:bh=-0.05", "eq=contrast=1.08:saturation=0.9"],
  };
  if (fx.look && looks[fx.look]) out.push(...looks[fx.look]);
  const b = fx.brightness ?? 0;
  const c = fx.contrast ?? 1;
  const s = fx.saturation ?? 1;
  if (b !== 0 || c !== 1 || s !== 1) out.push(`eq=brightness=${n3(b * 0.5)}:contrast=${n3(c)}:saturation=${n3(s)}`);
  if (fx.blur && fx.blur > 0) out.push(`gblur=sigma=${n3(fx.blur)}`);
  if (fx.sharpen && fx.sharpen > 0) out.push(`unsharp=5:5:${n3(fx.sharpen)}:5:5:0`);
  if (fx.vignette && fx.vignette > 0) out.push(`vignette=angle=${n3((0.25 + fx.vignette * 0.55) * Math.PI)}`);
  return out;
}

/** Audio effects → FFmpeg filters. */
export function audioFx(fx: ClipEffects | undefined): string[] {
  if (!fx) return [];
  const out: string[] = [];
  if (fx.denoise) out.push("afftdn=nf=-25");
  if (fx.voice) out.push("highpass=f=90", "equalizer=f=3000:t=q:w=1.2:g=4");
  if (fx.bass) out.push(`bass=g=${n3(fx.bass)}`);
  if (fx.treble) out.push(`treble=g=${n3(fx.treble)}`);
  if (fx.echo) out.push("aecho=0.8:0.6:60:0.25");
  if (fx.normalize) out.push("dynaudnorm=f=150:g=15");
  if (fx.compressor) out.push("acompressor=threshold=0.125:ratio=3:attack=20:release=250");
  return out;
}

function audioChain(filters: string[], i: number, gainDb: number, fadeIn: number, fadeOut: number, dur: number, start: number, fps: number, fx?: ClipEffects): string {
  const chain = ["aresample=48000", "aformat=channel_layouts=stereo", ...audioFx(fx), `volume=${gainDb}dB`];
  if (fadeIn > 0) chain.push(`afade=t=in:st=0:d=${n3(fadeIn / fps)}`);
  if (fadeOut > 0) chain.push(`afade=t=out:st=${n3(dur - fadeOut / fps)}:d=${n3(fadeOut / fps)}`);
  const ms = Math.round(start * 1000);
  if (ms > 0) chain.push(`adelay=${ms}|${ms}`);
  filters.push(`[${i}:a]${chain.join(",")}[a${i}]`);
  return `a${i}`;
}
