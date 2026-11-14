"use client";

import { clipDuration, evaluateTransform, findClip, type ClipEffects, type Transform, type TransformKeyframe } from "@cinemind/timeline-engine";
import { useState } from "react";
import { useEditor } from "./EditorContext";

/* Inspector groups for reframing, picture effects and sound. Every change is a validated
   timeline operation, so it is undoable, versioned and identical in preview and export. */

export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 border-b border-line pb-1.5 text-[11px] uppercase tracking-[0.08em] text-muted">{title}</h4>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function ActionBtn({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-30 ${danger ? "border-danger/40 text-[#ffb3a8] hover:bg-danger/10" : "border-line-strong text-soft hover:border-accent/50 hover:text-text"}`}
    >
      {label}
    </button>
  );
}

export function Slider({ label, min, max, step, value, fmt, onCommit }: { label: string; min: number; max: number; step: number; value: number; fmt: (v: number) => string; onCommit: (v: number) => void }) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setV(value);
  }
  return (
    <label className="block">
      <span className="flex justify-between">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-[12px] text-soft">{fmt(v)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        onPointerUp={() => v !== value && onCommit(v)}
        onKeyUp={() => v !== value && onCommit(v)}
        className="mt-1 w-full accent-[var(--accent)]"
      />
    </label>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-full border border-line p-0.5 text-[11px]">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={`flex-1 rounded-full px-2 py-1 ${value === v ? "bg-white/10 text-text" : "text-muted hover:text-soft"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** Position, scale, fit/fill and crop: reframing a landscape shot for vertical and back. */
export function FrameGroup({ clipId }: { clipId: string }) {
  const { doc, run, playhead } = useEditor();
  const hit = findClip(doc, clipId);
  if (!hit) return null;
  const frame = Math.max(0, Math.min(clipDuration(hit.clip), playhead - hit.clip.timelineStartFrames));
  const t = evaluateTransform(hit.clip, frame);
  const crop = { left: 0, top: 0, right: 0, bottom: 0, ...t.crop };
  const { width: W, height: H } = doc.sequence;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const currentKey = hit.clip.transformKeyframes?.find((key) => key.frame === frame);
  const setT = (transform: Partial<Transform>) => {
    if (!currentKey) return run([{ type: "clip.setTransform", clipId, transform }]);
    const values: TransformKeyframe["values"] = { ...currentKey.values };
    const staticTransform: Partial<Transform> = {};
    for (const [key, value] of Object.entries(transform)) {
      if (key === "x" || key === "y" || key === "scaleX" || key === "scaleY" || key === "opacity") values[key] = value as number;
      else staticTransform[key as keyof Transform] = value as never;
    }
    if (Object.keys(staticTransform).length) return run([
      { type: "clip.setTransform", clipId, transform: staticTransform },
      { type: "clip.setTransformKeyframe", clipId, keyframe: { frame, values } },
    ]);
    return run([{ type: "clip.setTransformKeyframe", clipId, keyframe: { frame, values } }]);
  };
  const toggleKeyframe = () => {
    if (currentKey) run([{ type: "clip.removeTransformKeyframe", clipId, frame }]);
    else run([{ type: "clip.setTransformKeyframe", clipId, keyframe: { frame, values: { x: t.x, y: t.y, scaleX: t.scaleX, scaleY: t.scaleY, opacity: t.opacity } } }], "Keyframe added");
  };
  return (
    <Group title="Frame & crop">
      <div className="flex items-center justify-between rounded-lg border border-line bg-bg-deep px-3 py-2">
        <span className="text-[11px] text-muted">At playhead · {(frame / 30).toFixed(2)}s · {hit.clip.transformKeyframes?.length ?? 0} keys</span>
        <ActionBtn label={currentKey ? "Remove keyframe ◆" : "+ Keyframe ◆"} onClick={toggleKeyframe} />
      </div>
      <Seg value={(t.fit ?? "fit") as "fit" | "fill"} options={[["fit", "Fit (whole picture)"], ["fill", "Fill (no black bars)"]]} onChange={(fit) => setT({ fit })} />
      <Slider label="Scale" min={0.5} max={3} step={0.01} value={t.scaleX} fmt={pct} onCommit={(v) => setT({ scaleX: v, scaleY: v })} />
      <Slider label="Position X" min={-W / 2} max={W / 2} step={2} value={t.x} fmt={(v) => `${Math.round(v)} px`} onCommit={(v) => setT({ x: Math.round(v) })} />
      <Slider label="Position Y" min={-H / 2} max={H / 2} step={2} value={t.y} fmt={(v) => `${Math.round(v)} px`} onCommit={(v) => setT({ y: Math.round(v) })} />
      <Slider label="Opacity" min={0} max={1} step={0.01} value={t.opacity} fmt={pct} onCommit={(v) => setT({ opacity: v })} />
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {(["left", "right", "top", "bottom"] as const).map((edge) => (
          <Slider key={edge} label={`Crop ${edge}`} min={0} max={0.45} step={0.01} value={crop[edge]} fmt={pct} onCommit={(v) => setT({ crop: { ...crop, [edge]: v } })} />
        ))}
      </div>
      <ActionBtn label="Reset frame" onClick={() => setT({ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, fit: "fit", crop: { left: 0, top: 0, right: 0, bottom: 0 } })} />
    </Group>
  );
}

const LOOKS: [NonNullable<ClipEffects["look"]>, string][] = [
  ["none", "Original"],
  ["cinematic", "Cinematic"],
  ["warm", "Warm"],
  ["cool", "Cool"],
  ["vintage", "Vintage"],
  ["bw", "B&W"],
];

export function EffectsGroup({ clipId }: { clipId: string }) {
  const { doc, run } = useEditor();
  const hit = findClip(doc, clipId);
  if (!hit) return null;
  const fx = hit.clip.fx ?? {};
  const set = (p: Partial<ClipEffects>) => run([{ type: "clip.setEffects", clipId, fx: p }]);
  return (
    <Group title="Effects">
      <div className="grid grid-cols-3 gap-1.5">
        {LOOKS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => set({ look: k })}
            className={`overflow-hidden rounded-[8px] border text-[11px] font-semibold ${(fx.look ?? "none") === k ? "border-accent text-text" : "border-line text-muted hover:border-line-strong"}`}
          >
            <span className="block h-7 bg-[linear-gradient(120deg,#e9a25a,#1eb53a_45%,#00a3dd)]" style={{ filter: cssLook(k) }} />
            <span className="block py-1">{l}</span>
          </button>
        ))}
      </div>
      <Slider label="Brightness" min={-1} max={1} step={0.02} value={fx.brightness ?? 0} fmt={(v) => (v > 0 ? "+" : "") + Math.round(v * 100)} onCommit={(v) => set({ brightness: v })} />
      <Slider label="Contrast" min={0} max={2} step={0.02} value={fx.contrast ?? 1} fmt={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => set({ contrast: v })} />
      <Slider label="Saturation" min={0} max={3} step={0.02} value={fx.saturation ?? 1} fmt={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => set({ saturation: v })} />
      <Slider label="Blur" min={0} max={20} step={0.5} value={fx.blur ?? 0} fmt={(v) => `${v} px`} onCommit={(v) => set({ blur: v })} />
      <Slider label="Sharpen" min={0} max={5} step={0.1} value={fx.sharpen ?? 0} fmt={(v) => v.toFixed(1)} onCommit={(v) => set({ sharpen: v })} />
      <Slider label="Vignette" min={0} max={1} step={0.01} value={fx.vignette ?? 0} fmt={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => set({ vignette: v })} />
      <ActionBtn label="Reset effects" onClick={() => set({ look: "none", brightness: 0, contrast: 1, saturation: 1, blur: 0, sharpen: 0, vignette: 0 })} />
    </Group>
  );
}

const SOUND_TOGGLES: { k: "normalize" | "denoise" | "voice" | "echo" | "compressor"; label: string; hint: string }[] = [
  { k: "normalize", label: "Normalize loudness", hint: "Even out quiet and loud parts" },
  { k: "denoise", label: "Reduce noise", hint: "Hiss, hum, fans and wind" },
  { k: "voice", label: "Voice clarity", hint: "Clearer speech and vocals" },
  { k: "echo", label: "Echo", hint: "Small-room reverb" },
  { k: "compressor", label: "Voice compressor", hint: "Tame peaks and even out speech" },
];

export function SoundGroup({ clipId }: { clipId: string }) {
  const { doc, run, assetById } = useEditor();
  const hit = findClip(doc, clipId);
  if (!hit) return null;
  const { clip, track } = hit;
  const fx = clip.fx ?? {};
  const set = (p: Partial<ClipEffects>) => run([{ type: "clip.setEffects", clipId, fx: p }]);
  const asset = clip.assetId ? assetById.get(clip.assetId) : undefined;

  const detach = () => {
    const end = clip.timelineStartFrames + clipDuration(clip);
    const free = doc.tracks
      .filter((t) => t.kind === "audio" && !t.locked)
      .find((t) => !t.clips.some((c) => c.timelineStartFrames < end && c.timelineStartFrames + clipDuration(c) > clip.timelineStartFrames));
    if (!free || !clip.assetId) {
      run([{ type: "audio.setGain", clipId, gainDb: -60 }], "No free audio track here — muted the clip instead");
      return;
    }
    run(
      [
        { type: "clip.insert", assetId: clip.assetId, trackId: free.id, timelineStartFrames: clip.timelineStartFrames, sourceInFrames: clip.sourceInFrames, sourceOutFrames: clip.sourceOutFrames },
        { type: "audio.setGain", clipId, gainDb: -60 },
      ],
      `Audio detached to ${free.name}`,
    );
  };

  return (
    <Group title="Sound">
      {track.kind === "video" && (
        <Slider label="Clip volume" min={-60} max={12} step={0.5} value={clip.gainDb ?? 0} fmt={(v) => (v <= -60 ? "Muted" : `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`)} onCommit={(v) => run([{ type: "audio.setGain", clipId, gainDb: v }])} />
      )}
      {SOUND_TOGGLES.map(({ k, label, hint }) => (
        <label key={k} className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="text-soft">{label}</span>
            <span className="block text-[11px] text-faint">{hint}</span>
          </span>
          <input type="checkbox" checked={!!fx[k]} onChange={(e) => set({ [k]: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
        </label>
      ))}
      <Slider label="Bass" min={-12} max={12} step={0.5} value={fx.bass ?? 0} fmt={(v) => `${v > 0 ? "+" : ""}${v} dB`} onCommit={(v) => set({ bass: v })} />
      <Slider label="Treble" min={-12} max={12} step={0.5} value={fx.treble ?? 0} fmt={(v) => `${v > 0 ? "+" : ""}${v} dB`} onCommit={(v) => set({ treble: v })} />
      {track.kind === "video" && asset?.kind === "video" && <ActionBtn label="Detach audio to its own track" onClick={detach} />}
      <p className="text-[11px] text-faint">Volume and fades play live; sound effects are applied in the exported video.</p>
    </Group>
  );
}

/** CSS approximation of each look, used by the preview monitor and the look swatches. */
export function cssLook(look: ClipEffects["look"]): string {
  switch (look) {
    case "bw":
      return "grayscale(1)";
    case "vintage":
      return "sepia(0.45) contrast(0.95) saturate(0.85)";
    case "warm":
      return "sepia(0.18) saturate(1.15) hue-rotate(-8deg)";
    case "cool":
      return "saturate(0.95) hue-rotate(12deg) brightness(1.02)";
    case "cinematic":
      return "contrast(1.08) saturate(0.9) hue-rotate(4deg)";
    default:
      return "";
  }
}

export function cssFx(fx: ClipEffects | undefined): string {
  if (!fx) return "";
  const parts = [cssLook(fx.look)];
  if (fx.brightness) parts.push(`brightness(${1 + fx.brightness * 0.5})`);
  if (fx.contrast !== undefined && fx.contrast !== 1) parts.push(`contrast(${fx.contrast})`);
  if (fx.saturation !== undefined && fx.saturation !== 1) parts.push(`saturate(${fx.saturation})`);
  if (fx.blur) parts.push(`blur(${fx.blur * 0.4}px)`);
  if (fx.sharpen) parts.push(`contrast(${1 + fx.sharpen * 0.035})`);
  return parts.filter(Boolean).join(" ");
}
