"use client";

import { clipDuration, clipEnd, framesToTimecode, type Clip, type Track } from "@cinemind/timeline-engine";
import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useEditor } from "./EditorContext";
import { FPS, clipPeaks, waveform } from "./model";
import { Eye, Lock, Mute, Scissors, Trash, Volume, ZoomIn, ZoomOut } from "@/components/ui/icons";

const HEADER_W = 116;
const ROW_H: Record<Track["kind"], number> = { video: 58, text: 34, audio: 50 };
const SNAP_PX = 8;

type Drag =
  | { mode: "move"; clip: Clip; fromTrack: Track; startX: number; startY: number; dx: number; targetTrackId: string; snapped: number }
  | { mode: "trim-start" | "trim-end"; clip: Clip; track: Track; startX: number; dx: number; snapped: number };

export function Timeline() {
  const { doc, zoom, setZoom, playhead, setPlayhead, selectedId, select, run, duration, assetById } = useEditor();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const tracks = useMemo(() => {
    const order = { video: 0, audio: 1, text: 2 } as const;
    return [...doc.tracks].sort((a, b) =>
      a.kind === b.kind ? (a.kind === "audio" ? a.order - b.order : b.order - a.order) : order[a.kind] - order[b.kind],
    );
  }, [doc.tracks]);

  const width = Math.max((duration + 20 * FPS) * zoom, 1200);
  const fps = FPS;

  // Snap candidates: playhead + every clip edge.
  /** Beats of the music on the timeline (from on-device analysis), in timeline frames. */
  const beatFrames = useMemo(() => {
    const out: { f: number; down: boolean }[] = [];
    for (const t of doc.tracks) {
      if (t.kind !== "audio" || t.muted) continue;
      for (const c of t.clips) {
        const a = c.assetId ? assetById.get(c.assetId) : undefined;
        if (!a?.beats?.length) continue;
        a.beats.forEach((b, i) => {
          const f = c.timelineStartFrames + Math.round(b * FPS) - c.sourceInFrames;
          if (f >= c.timelineStartFrames && f <= clipEnd(c)) out.push({ f, down: i % 4 === 0 });
        });
      }
    }
    return out;
  }, [doc.tracks, assetById]);

  const snapPoints = useMemo(() => {
    const pts = [0, playhead];
    for (const t of doc.tracks) for (const c of t.clips) pts.push(c.timelineStartFrames, clipEnd(c));
    for (const b of beatFrames) pts.push(b.f);
    return pts;
  }, [doc.tracks, playhead, beatFrames]);

  const snap = (frame: number, ignore?: Clip) => {
    let best = frame;
    let bestDist = SNAP_PX / zoom;
    for (const p of snapPoints) {
      if (ignore && (p === ignore.timelineStartFrames || p === clipEnd(ignore))) continue;
      const d = Math.abs(p - frame);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return Math.round(best);
  };

  const frameFromClientX = (clientX: number) => {
    const el = lanesRef.current!;
    const rect = el.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left) / zoom);
  };

  // ---- Ruler / playhead scrubbing ----
  const scrub = (e: RPointerEvent) => {
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setPlayhead(frameFromClientX(e.clientX));
  };

  // ---- Clip drag / trim ----
  const beginClipDrag = (e: RPointerEvent, clip: Clip, track: Track, mode: Drag["mode"]) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    select(clip.id);
    if (track.locked) return;
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-released pointer */
    }
    if (mode === "move")
      setDrag({ mode, clip, fromTrack: track, startX: e.clientX, startY: e.clientY, dx: 0, targetTrackId: track.id, snapped: clip.timelineStartFrames });
    else setDrag({ mode, clip, track, startX: e.clientX, dx: 0, snapped: mode === "trim-start" ? clip.timelineStartFrames : clipEnd(clip) });
  };

  const onPointerMove = (e: RPointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (drag.mode === "move") {
      const raw = drag.clip.timelineStartFrames + dx / zoom;
      const dur = clipDuration(drag.clip);
      let s = snap(raw, drag.clip);
      const endSnap = snap(raw + dur, drag.clip) - dur;
      if (Math.abs(endSnap - raw) < Math.abs(s - raw)) s = endSnap;
      // Track under the pointer (same kind only).
      let targetTrackId = drag.targetTrackId;
      const under = document.elementsFromPoint(e.clientX, e.clientY).find((n) => (n as HTMLElement).dataset?.trackId);
      if (under) {
        const tid = (under as HTMLElement).dataset.trackId!;
        const t = doc.tracks.find((x) => x.id === tid);
        if (t && t.kind === drag.fromTrack.kind) targetTrackId = tid;
      }
      setDrag({ ...drag, dx, snapped: Math.max(0, s), targetTrackId });
    } else {
      const edge = (drag.mode === "trim-start" ? drag.clip.timelineStartFrames : clipEnd(drag.clip)) + dx / zoom;
      setDrag({ ...drag, dx, snapped: Math.max(0, snap(edge, drag.clip)) });
    }
  };

  const onPointerUp = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (Math.abs(d.dx) < 2 && d.mode !== "move") return;
    if (d.mode === "move") {
      if (d.snapped === d.clip.timelineStartFrames && d.targetTrackId === d.fromTrack.id) return;
      run([{ type: "clip.move", clipId: d.clip.id, trackId: d.targetTrackId, timelineStartFrames: d.snapped }]);
    } else if (d.mode === "trim-end") {
      const out = d.clip.sourceInFrames + (d.snapped - d.clip.timelineStartFrames);
      const asset = d.clip.assetId ? assetById.get(d.clip.assetId) : null;
      const max = asset ? asset.durationFrames : Infinity;
      run([{ type: "clip.trim", clipId: d.clip.id, sourceInFrames: d.clip.sourceInFrames, sourceOutFrames: Math.min(Math.max(out, d.clip.sourceInFrames + 1), max) }]);
    } else {
      const delta = d.snapped - d.clip.timelineStartFrames;
      const newIn = Math.max(0, d.clip.sourceInFrames + delta);
      const applied = newIn - d.clip.sourceInFrames;
      if (applied === 0 || newIn >= d.clip.sourceOutFrames) return;
      // Trim first (keeps start), then slide right/left by the same amount.
      const ops =
        applied > 0
          ? [
              { type: "clip.trim" as const, clipId: d.clip.id, sourceInFrames: newIn, sourceOutFrames: d.clip.sourceOutFrames },
              { type: "clip.move" as const, clipId: d.clip.id, trackId: d.track.id, timelineStartFrames: d.clip.timelineStartFrames + applied },
            ]
          : [
              { type: "clip.move" as const, clipId: d.clip.id, trackId: d.track.id, timelineStartFrames: d.clip.timelineStartFrames + applied },
              { type: "clip.trim" as const, clipId: d.clip.id, sourceInFrames: newIn, sourceOutFrames: d.clip.sourceOutFrames },
            ];
      // Extending to the left: the move happens with the old length, so check the space first.
      run(ops);
    }
  };

  const splitAtPlayhead = () => {
    const target =
      (selectedId && doc.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedId && playhead > c.timelineStartFrames && playhead < clipEnd(c))) ||
      tracks.flatMap((t) => t.clips).find((c) => playhead > c.timelineStartFrames && playhead < clipEnd(c));
    if (target) run([{ type: "clip.split", clipId: target.id, atTimelineFrame: playhead }], "Split clip");
  };

  // Ruler ticks.
  const tickEvery = zoom >= 6 ? 1 : zoom >= 2.5 ? 2 : zoom >= 1.2 ? 5 : 10; // seconds
  const ticks: number[] = [];
  for (let s = 0; s * fps * zoom < width; s += tickEvery) ticks.push(s);

  return (
    <section className="flex min-h-0 flex-col border-t border-line bg-bg-deep" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      {/* Toolbar */}
      <div className="thin-scroll flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-line px-2 text-[12px] sm:px-3">
        <button title="Split selected clip at playhead (S)" aria-label="Cut clip at playhead" onClick={splitAtPlayhead} className="flex h-7 items-center gap-1.5 rounded-md bg-accent/10 px-2 text-[11px] font-bold text-accent hover:bg-accent/20"><Scissors size={14} /> Cut</button>
        <ToolBtn label="Delete selected (Del)" disabled={!selectedId} onClick={() => selectedId && run([{ type: "clip.delete", clipId: selectedId }], "Deleted clip")}>
          <Trash size={15} />
        </ToolBtn>
        <span className="mx-2 h-4 w-px bg-line" />
        <span className="font-mono text-accent">{framesToTimecode(playhead, fps)}</span>
        <span className="ml-2 text-faint">/ {framesToTimecode(duration, fps)}</span>
        <span className="ml-auto text-faint">{beatFrames.length ? `Snapping to ${beatFrames.length} beats` : "Snapping on"} · v{doc.version}</span>
        <span className="mx-2 h-4 w-px bg-line" />
        <ToolBtn label="Zoom out" onClick={() => setZoom(Math.max(0.4, zoom / 1.4))}>
          <ZoomOut size={15} />
        </ToolBtn>
        <input
          aria-label="Timeline zoom"
          type="range"
          min={0.4}
          max={12}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-24 accent-[var(--accent)]"
        />
        <ToolBtn label="Zoom in" onClick={() => setZoom(Math.min(12, zoom * 1.4))}>
          <ZoomIn size={15} />
        </ToolBtn>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Track headers */}
        <div className="shrink-0 border-r border-line bg-surface" style={{ width: HEADER_W }}>
          <div className="h-7 border-b border-line" />
          {tracks.map((t) => (
            <TrackHeader key={t.id} track={t} />
          ))}
        </div>

        {/* Lanes */}
        <div ref={scrollRef} className="thin-scroll relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div ref={lanesRef} className="relative" style={{ width }}>
            {/* Ruler */}
            <div className="sticky top-0 z-20 h-7 cursor-ew-resize border-b border-line bg-surface-2" onPointerDown={scrub} onPointerMove={(e) => e.buttons === 1 && setPlayhead(frameFromClientX(e.clientX))}>
              {ticks.map((s) => (
                <div key={s} className="absolute top-0 h-full border-l border-white/10" style={{ left: s * fps * zoom }}>
                  <span className="ml-1 font-mono text-[10px] text-faint">{framesToTimecode(s * fps, fps).slice(3, 8)}</span>
                </div>
              ))}
              {beatFrames.map((b) => (
                <span
                  key={b.f}
                  title={b.down ? "Downbeat" : "Beat"}
                  className={`pointer-events-none absolute bottom-0 w-px ${b.down ? "h-3 bg-sun" : "h-1.5 bg-sun/60"}`}
                  style={{ left: b.f * zoom }}
                />
              ))}
            </div>

            {tracks.map((t) => (
              <div
                key={t.id}
                data-track-id={t.id}
                className={`relative border-b border-line ${drag?.mode === "move" && drag.targetTrackId === t.id ? "bg-white/[0.03]" : ""} ${t.hidden ? "opacity-40" : ""}`}
                style={{ height: ROW_H[t.kind] }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) {
                    select(null);
                    setPlayhead(frameFromClientX(e.clientX));
                  }
                }}
              >
                {t.clips.map((c) => {
                  const dragging = drag && drag.clip.id === c.id;
                  let left = c.timelineStartFrames * zoom;
                  let w = clipDuration(c) * zoom;
                  let hiddenHere = false;
                  if (dragging && drag.mode === "move") {
                    left = drag.snapped * zoom;
                    hiddenHere = drag.targetTrackId !== t.id;
                  } else if (dragging && drag.mode === "trim-end") {
                    w = Math.max(4, (drag.snapped - c.timelineStartFrames) * zoom);
                  } else if (dragging && drag.mode === "trim-start") {
                    left = drag.snapped * zoom;
                    w = Math.max(4, (clipEnd(c) - drag.snapped) * zoom);
                  }
                  if (hiddenHere) return null;
                  return (
                    <ClipBlock
                      key={c.id}
                      clip={c}
                      track={t}
                      left={left}
                      width={w}
                      selected={selectedId === c.id}
                      dragging={!!dragging}
                      onDown={(e, mode) => beginClipDrag(e, c, t, mode)}
                    />
                  );
                })}
                {/* Ghost of a clip being dragged in from another track */}
                {drag?.mode === "move" && drag.targetTrackId === t.id && drag.fromTrack.id !== t.id && (
                  <ClipBlock clip={drag.clip} track={drag.fromTrack} left={drag.snapped * zoom} width={clipDuration(drag.clip) * zoom} selected dragging onDown={() => {}} />
                )}
              </div>
            ))}

            {/* Transitions */}
            {doc.transitions.map((tr) => {
              const to = doc.tracks.flatMap((t) => t.clips).find((c) => c.id === tr.toClipId);
              const tIdx = tracks.findIndex((t) => t.clips.some((c) => c.id === tr.toClipId));
              if (!to || tIdx < 0) return null;
              const top = 28 + tracks.slice(0, tIdx).reduce((s, t) => s + ROW_H[t.kind], 0);
              return (
                <div
                  key={tr.id}
                  title={`${tr.kind} · ${(tr.durationFrames / fps).toFixed(1)}s`}
                  className="pointer-events-none absolute z-10 rounded-sm border border-accent/80 bg-accent/25"
                  style={{ left: (to.timelineStartFrames - tr.durationFrames / 2) * zoom, width: tr.durationFrames * zoom, top: top + 6, height: ROW_H[tracks[tIdx].kind] - 12 }}
                />
              );
            })}

            {/* Playhead */}
            <div className="pointer-events-none absolute bottom-0 top-0 z-30 w-px bg-accent" style={{ left: playhead * zoom }}>
              <div className="absolute -left-[5px] top-0 h-3 w-[11px] rounded-b-sm bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackHeader({ track }: { track: Track }) {
  const { run } = useEditor();
  const toggle = (k: "muted" | "locked" | "hidden") => run([{ type: "track.update", trackId: track.id, [k]: !track[k] }]);
  const color = track.kind === "video" ? "text-[#8fb7cc]" : track.kind === "audio" ? "text-[#9cc79f]" : "text-accent";
  return (
    <div className="flex items-center gap-1 border-b border-line px-1.5 sm:gap-2 sm:px-3" style={{ height: ROW_H[track.kind] }}>
      <span className={`w-5 shrink-0 font-mono text-[10px] sm:w-6 sm:text-[11px] ${color}`}>{track.name}</span>
      <span className="ml-auto flex items-center gap-0">
        {track.kind !== "audio" && (
          <IconToggle on={!track.hidden} label={track.hidden ? "Show track" : "Hide track"} onClick={() => toggle("hidden")}>
            <Eye size={13} />
          </IconToggle>
        )}
        {track.kind !== "text" && (
          <IconToggle on={!track.muted} label={track.muted ? "Unmute" : "Mute"} onClick={() => toggle("muted")}>
            {track.muted ? <Mute size={13} /> : <Volume size={13} />}
          </IconToggle>
        )}
        <IconToggle on={!!track.locked} activeGold label={track.locked ? "Unlock" : "Lock"} onClick={() => toggle("locked")}>
          <Lock size={13} />
        </IconToggle>
      </span>
    </div>
  );
}

function IconToggle({ on, onClick, label, children, activeGold }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode; activeGold?: boolean }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-6 w-6 place-items-center rounded transition-colors hover:bg-white/5 ${activeGold ? (on ? "text-accent" : "text-faint") : on ? "text-soft" : "text-danger"}`}
    >
      {children}
    </button>
  );
}

function ClipBlock({
  clip,
  track,
  left,
  width,
  selected,
  dragging,
  onDown,
}: {
  clip: Clip;
  track: Track;
  left: number;
  width: number;
  selected: boolean;
  dragging: boolean;
  onDown: (e: RPointerEvent, mode: Drag["mode"]) => void;
}) {
  const { assetById } = useEditor();
  const asset = clip.assetId ? assetById.get(clip.assetId) : null;
  const bg = track.kind === "video" ? "var(--clip-video)" : track.kind === "audio" ? "var(--clip-audio)" : "var(--clip-text)";
  const thumb = asset?.thumbUrl ?? (asset?.photo ? `https://images.unsplash.com/${asset.photo.id}?auto=format&fit=crop&w=160&h=90&q=60` : null);
  const bars = track.kind === "audio" ? Math.max(4, Math.floor(width / 3)) : 0;
  const wave = bars ? (clipPeaks(asset ?? undefined, clip.sourceInFrames, clip.sourceOutFrames, bars) ?? waveform(`${clip.assetId}:${clip.sourceInFrames}`, bars)) : [];
  const fadeIn = (clip.fadeInFrames ?? 0) / Math.max(1, clip.sourceOutFrames - clip.sourceInFrames);
  const fadeOut = (clip.fadeOutFrames ?? 0) / Math.max(1, clip.sourceOutFrames - clip.sourceInFrames);

  return (
    <div
      className={`group absolute top-1 bottom-1 cursor-grab overflow-hidden rounded-[3px] ${dragging ? "z-20 cursor-grabbing opacity-90 shadow-lg" : ""} ${selected ? "ring-2 ring-accent" : "ring-1 ring-white/10"} ${track.locked ? "cursor-not-allowed" : ""}`}
      style={{
        left,
        width,
        background: bg,
        ...(track.kind === "video" && thumb
          ? { backgroundImage: `linear-gradient(rgba(6,19,23,0.45), rgba(6,19,23,0.65)), url("${thumb}")`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }
          : {}),
      }}
      onPointerDown={(e) => onDown(e, "move")}
      title={clip.label}
    >
      {track.kind === "video" && asset?.url && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-teal" title="Local media" />}
      {track.kind === "audio" && (
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${bars} 20`} preserveAspectRatio="none">
          {wave.map((v, i) => (
            <rect key={i} x={i + 0.2} y={Math.round((10 - v * 8) * 100) / 100} width={0.6} height={Math.round(v * 1600) / 100} fill="#d7ecd9" opacity={track.muted ? 0.2 : 0.55} />
          ))}
        </svg>
      )}
      {(fadeIn > 0 || fadeOut > 0) && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
          {fadeIn > 0 && <path d={`M0 20 L${fadeIn * 100} 0 L0 0 Z`} fill="rgba(0,0,0,0.45)" />}
          {fadeOut > 0 && <path d={`M100 20 L${100 - fadeOut * 100} 0 L100 0 Z`} fill="rgba(0,0,0,0.45)" />}
        </svg>
      )}
      <span className="pointer-events-none relative block truncate px-2 pt-1 text-[11px] font-medium text-white/90">
        {track.kind === "text" ? `T  ${clip.text}` : clip.label}
      </span>
      {track.kind === "video" && width > 90 && (
        <span className="pointer-events-none relative block px-2 font-mono text-[10px] text-white/50">
          {((clip.sourceOutFrames - clip.sourceInFrames) / FPS).toFixed(1)}s
        </span>
      )}
      {clip.transformKeyframes?.map((key) => (
        <span
          key={key.frame}
          title={`Transform keyframe · ${(key.frame / FPS).toFixed(2)}s`}
          className="pointer-events-none absolute top-0.5 z-10 -translate-x-1/2 text-[10px] leading-none text-sun drop-shadow"
          style={{ left: `${(key.frame / Math.max(1, clipDuration(clip))) * 100}%` }}
        >
          ◆
        </span>
      ))}
      {/* Trim handles */}
      {!track.locked && (
        <>
          <span
            onPointerDown={(e) => onDown(e, "trim-start")}
            className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-white/0 transition-colors group-hover:bg-white/25"
          />
          <span
            onPointerDown={(e) => onDown(e, "trim-end")}
            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-white/0 transition-colors group-hover:bg-white/25"
          />
        </>
      )}
    </div>
  );
}

function ToolBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded text-soft transition-colors hover:bg-white/5 hover:text-text disabled:opacity-30"
    >
      {children}
    </button>
  );
}
