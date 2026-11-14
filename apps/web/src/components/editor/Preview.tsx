"use client";

import { clipEnd, evaluateTransform, framesToTimecode, type Clip } from "@cinemind/timeline-engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { FrameDialog, framePresetFor } from "./FrameDialog";
import { CropOverlay } from "./CropOverlay";
import { Photo } from "@/components/visual/Photo";
import { Pause, Play, SkipBack, SkipFwd } from "@/components/ui/icons";
import { useEditor } from "./EditorContext";
import { cssFx } from "./InspectorGroups";
import { FPS } from "./model";

/**
 * Proxy preview (spec §4.4): a convenience view of the timeline, not the authoritative render.
 * Local media plays through <video>/<audio>; sample media shows illustrative frames.
 */
export function Preview() {
  const { doc, playhead, playing, togglePlay, setPlayhead, assetById, duration, loop, setLoop, projectId } = useEditor();
  const [frameOpen, setFrameOpen] = useState(false);
  const [cropping, setCropping] = useState(false);
  const { run, select } = useEditor();
  const preset = framePresetFor(projectId ?? "demo", doc.sequence.width, doc.sequence.height);
  const { width, height } = doc.sequence;

  const at = (c: Clip) => playhead >= c.timelineStartFrames && playhead < clipEnd(c);

  // Topmost visible video clip wins (V2 over V1).
  const videoClip = useMemo(() => {
    const vTracks = doc.tracks.filter((t) => t.kind === "video" && !t.hidden).sort((a, b) => b.order - a.order);
    for (const t of vTracks) {
      const c = t.clips.find(at);
      if (c) return { clip: c, muted: !!t.muted };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, playhead]);

  const titles = doc.tracks.filter((t) => t.kind === "text" && !t.hidden).flatMap((t) => t.clips.filter(at));
  const audible = doc.tracks
    .filter((t) => t.kind === "audio" && !t.muted)
    .flatMap((t) => t.clips.filter(at))
    .filter((c) => c.assetId && assetById.get(c.assetId)?.url);

  const asset = videoClip?.clip.assetId ? assetById.get(videoClip.clip.assetId) : null;
  const tf = videoClip ? evaluateTransform(videoClip.clip, playhead - videoClip.clip.timelineStartFrames) : undefined;
  const opacity = tf?.opacity ?? 1;
  const scale = tf?.scaleX ?? 1;
  // While cropping, show the whole picture (no crop, fit) so the frame can be drawn over it.
  const crop = cropping ? undefined : tf?.crop;
  // Crop the source first (object-view-box), then fit or fill the frame — same order as the export.
  const mediaStyle = {
    objectFit: tf?.fit === "fill" && !cropping ? "cover" : "contain",
    ...(crop && crop.left + crop.right + crop.top + crop.bottom > 0
      ? { objectViewBox: `inset(${crop.top * 100}% ${crop.right * 100}% ${crop.bottom * 100}% ${crop.left * 100}%)` }
      : {}),
  } as React.CSSProperties;
  const wrapperTransform = cropping ? "none" : `translate(${((tf?.x ?? 0) / width) * 100}%, ${((tf?.y ?? 0) / height) * 100}%) scale(${scale})`;
  const srcAspect = asset?.width && asset?.height ? asset.width / asset.height : 16 / 9;

  // Fade-through-black for transitions around the playhead.
  const transitionDim = useMemo(() => {
    for (const tr of doc.transitions) {
      const to = doc.tracks.flatMap((t) => t.clips).find((c) => c.id === tr.toClipId);
      if (!to) continue;
      const d = Math.abs(playhead - to.timelineStartFrames);
      if (d < tr.durationFrames / 2) return 1 - d / (tr.durationFrames / 2);
    }
    return 0;
  }, [doc, playhead]);

  return (
    <section className="flex min-h-0 min-w-0 flex-col bg-bg-deep">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-line px-4 text-[12px] text-muted">
        <span>Program · {width}×{height} · {FPS} fps</span>
        <span className="rounded bg-white/5 px-2 py-0.5 text-[11px]">Preview · media stays local</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <div
          className="relative max-h-full max-w-full overflow-hidden bg-black shadow-2xl ring-1 ring-white/10"
          style={{ aspectRatio: `${width} / ${height}`, height: width >= height ? undefined : "100%", width: width >= height ? "100%" : undefined }}
        >
          <div className="absolute inset-0" style={{ opacity, transform: wrapperTransform, filter: cssFx(videoClip?.clip.fx) || undefined, boxShadow: videoClip?.clip.fx?.vignette ? `inset 0 0 ${Math.round(140 * videoClip.clip.fx.vignette)}px rgba(0,0,0,${0.8 * videoClip.clip.fx.vignette})` : undefined }}>
            {videoClip && asset?.url && asset.kind === "video" && (
              <SyncedMedia kind="video" src={asset.url} clip={videoClip.clip} playhead={playhead} playing={playing} muted={videoClip.muted} mediaStyle={mediaStyle} />
            )}
            {videoClip && asset?.url && asset.kind === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt="" className="h-full w-full" style={mediaStyle} />
            )}
            {videoClip && !asset?.url && asset?.photo && <Photo photo={asset.photo} sizes="60vw" className="scale-105" />}
          </div>
          {!videoClip && <div className="absolute inset-0 grid place-items-center text-[12px] text-faint">No video at playhead</div>}
          {cropping && videoClip && (
            <CropOverlay
              srcAspect={srcAspect}
              boxAspect={width / height}
              initial={{ left: 0, right: 0, top: 0, bottom: 0, ...tf?.crop }}
              onCancel={() => setCropping(false)}
              onDone={(c) => {
                run([{ type: "clip.setTransform", clipId: videoClip.clip.id, transform: { crop: c } }], "Crop applied");
                setCropping(false);
              }}
            />
          )}
          {transitionDim > 0 && <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: transitionDim * 0.85 }} />}
          {titles.map((t) => (
            <div key={t.id} className="pointer-events-none absolute inset-x-0 bottom-[12%] text-center">
              <span className="text-[clamp(14px,3.2vw,42px)] font-semibold tracking-[0.18em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">{t.text}</span>
            </div>
          ))}
          {/* Title-safe guide */}
          <div className="pointer-events-none absolute inset-[5%] border border-white/[0.06]" />
          {audible.map((c) => (
            <SyncedMedia key={c.id} kind="audio" src={assetById.get(c.assetId!)!.url!} clip={c} playhead={playhead} playing={playing} muted={false} />
          ))}
        </div>
      </div>
      <div className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-line px-3">
        <span />
        <div className="flex items-center gap-1 sm:gap-3">
        <button aria-label="Go to start" onClick={() => setPlayhead(0)} className="grid h-8 w-8 place-items-center rounded text-soft hover:bg-white/5">
          <SkipBack size={15} />
        </button>
        <button aria-label={playing ? "Pause" : "Play"} onClick={togglePlay} className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-ink hover:brightness-110">
          {playing ? <Pause size={14} /> : <Play size={14} className="translate-x-px" />}
        </button>
        <button aria-label="Go to end" onClick={() => setPlayhead(duration)} className="grid h-8 w-8 place-items-center rounded text-soft hover:bg-white/5">
          <SkipFwd size={15} />
        </button>
        <button
          aria-label="Repeat"
          aria-pressed={loop}
          title={loop ? "Repeat on" : "Repeat off"}
          onClick={() => setLoop(!loop)}
          className={`grid h-8 w-8 place-items-center rounded-full transition ${loop ? "bg-accent/20 text-accent" : "text-muted hover:bg-white/5 hover:text-soft"}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 013-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 01-3 3H3" />
          </svg>
        </button>
        <span className="ml-1 hidden font-mono text-[12px] text-soft sm:ml-3 sm:inline">{framesToTimecode(playhead, FPS)}</span>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
        <button
          disabled={!videoClip}
          title={videoClip ? "Crop the clip under the playhead" : "Move the playhead over a video clip to crop it"}
          onClick={() => {
            if (!videoClip) return;
            if (playing) togglePlay();
            select(videoClip.clip.id);
            setCropping(true);
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold disabled:opacity-35 ${cropping ? "border-accent text-accent" : "border-line-strong text-soft hover:border-accent/60 hover:text-text"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M6 2v14a2 2 0 002 2h14" /><path d="M18 22V8a2 2 0 00-2-2H2" />
          </svg>
          <span className="hidden sm:inline">Crop</span>
        </button>
        <button
          onClick={() => setFrameOpen(true)}
          className="flex min-w-0 items-center gap-2 truncate rounded-full border border-line-strong px-3 py-1 text-[12px] font-semibold text-soft hover:border-accent/60 hover:text-text"
        >
          <span className="rounded-[2px] border border-current" style={{ width: doc.sequence.width >= doc.sequence.height ? 14 : 8, height: doc.sequence.width >= doc.sequence.height ? 8 : 14 }} />
          <span className="hidden sm:inline">Frame{preset ? ` · ${preset.name}` : ""}</span>
        </button>
        </div>
        {frameOpen && <FrameDialog onClose={() => setFrameOpen(false)} />}
      </div>
    </section>
  );
}

function SyncedMedia({ kind, src, clip, playhead, playing, muted, mediaStyle }: { kind: "video" | "audio"; src: string; clip: Clip; playhead: number; playing: boolean; muted: boolean; mediaStyle?: React.CSSProperties }) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const target = (playhead - clip.timelineStartFrames + clip.sourceInFrames) / FPS;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.abs(el.currentTime - target) > (playing ? 0.3 : 0.02)) el.currentTime = target;
    // Gain + fades
    const local = playhead - clip.timelineStartFrames;
    const len = clip.sourceOutFrames - clip.sourceInFrames;
    let g = Math.min(1, Math.pow(10, (clip.gainDb ?? 0) / 20));
    if (clip.fadeInFrames && local < clip.fadeInFrames) g *= local / clip.fadeInFrames;
    if (clip.fadeOutFrames && local > len - clip.fadeOutFrames) g *= Math.max(0, (len - local) / clip.fadeOutFrames);
    el.volume = Math.max(0, Math.min(1, g));
    el.muted = muted;
    if (playing && el.paused) el.play().catch(() => {});
    if (!playing && !el.paused) el.pause();
  }, [target, playing, muted, playhead, clip]);

  if (kind === "audio") return <audio ref={ref} src={src} preload="auto" />;
  return <video ref={ref} src={src} preload="auto" playsInline className="h-full w-full" style={mediaStyle} />;
}
