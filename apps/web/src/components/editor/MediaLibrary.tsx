"use client";

import { clipEnd } from "@cinemind/timeline-engine";
import { useRef, useState } from "react";
import { Photo } from "@/components/visual/Photo";
import { Film, Music, Plus, TextIcon, Upload } from "@/components/ui/icons";
import { useEditor } from "./EditorContext";
import { VoiceRecorder } from "./VoiceRecorder";
import { FPS, type EditorAsset } from "./model";

type Tab = "all" | "video" | "audio";

const STATUS: Record<string, string> = {
  uploading: "Adding",
  offline: "Offline on this device",
  uploaded: "Queued",
  processing: "Processing",
  analyzing: "Analysing",
  failed: "Failed",
};

export function MediaLibrary() {
  const { assets, importFiles, doc, run, playhead, projectId, relink } = useEditor();
  const relinkRef = useRef<HTMLInputElement>(null);
  const [relinkId, setRelinkId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [over, setOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = assets.filter(
    (a) => (tab === "all" || (tab === "video" ? a.kind !== "audio" : a.kind === "audio")) && a.name.toLowerCase().includes(query.toLowerCase()),
  );

  const usage = (id: string) => doc.tracks.reduce((n, t) => n + t.clips.filter((c) => c.assetId === id).length, 0);
  const usable = (a: EditorAsset) => a.durationFrames > 0 && a.status !== "uploading" && a.status !== "failed" && a.status !== "offline";

  /** Append to the end of the first matching unlocked track. */
  const addToTimeline = (a: EditorAsset) => {
    if (!usable(a)) return;
    const track = doc.tracks
      .filter((t) => (a.kind === "audio" ? t.kind === "audio" : t.kind === "video") && !t.locked)
      .sort((x, y) => x.order - y.order)[0];
    if (!track) return;
    const start = Math.max(0, ...track.clips.map(clipEnd));
    run([{ type: "clip.insert", assetId: a.id, trackId: track.id, timelineStartFrames: start }], `Added ${a.name} to ${track.name}`);
  };

  const addTitle = () => {
    const t1 = doc.tracks.find((t) => t.kind === "text");
    if (!t1) return;
    let start = playhead;
    while (t1.clips.some((c) => start < clipEnd(c) && start + 3 * FPS > c.timelineStartFrames)) start += FPS;
    run([{ type: "title.add", trackId: t1.id, text: "New title", startFrame: start, durationFrames: 3 * FPS }], "Added title");
  };

  return (
    <aside
      className={`flex min-h-0 flex-col border-r border-line bg-surface ${over ? "ring-2 ring-inset ring-accent/60" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) importFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-line px-4 text-[12px]">
        <span className="font-semibold text-soft">Media library</span>
        <span className="text-faint">{assets.length} items</span>
      </div>
      <div className="space-y-3 p-3">
        <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-line-strong py-3 text-[13px] font-semibold text-soft transition-colors hover:border-accent/60 hover:text-accent">
          <Upload size={15} /> Add media
        </button>
        <button onClick={() => setRecording(true)} className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-line py-2 text-[12px] font-semibold text-soft transition-colors hover:border-danger/60 hover:text-[#ffb3a8]">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" /> Record voice-over
        </button>
        {recording && <VoiceRecorder onClose={() => setRecording(false)} onDone={(f) => importFiles([f])} />}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) importFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={relinkRef}
          type="file"
          accept="video/*,audio/*,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && relinkId) void relink(relinkId, f);
            e.target.value = "";
            setRelinkId(null);
          }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search media"
          className="w-full rounded-[10px] border border-line bg-bg-deep px-3 py-1.5 text-[13px] outline-none placeholder:text-faint focus:border-accent/50"
        />
        <div className="flex gap-1 text-[12px]">
          {(["all", "video", "audio"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-2.5 py-1 capitalize ${tab === t ? "bg-white/10 text-text" : "text-muted hover:text-soft"}`}>
              {t}
            </button>
          ))}
          <button onClick={addTitle} className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-muted hover:text-accent" title="Add title at playhead">
            <TextIcon size={13} /> Title
          </button>
        </div>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-2 gap-2.5">
          {shown.map((a) => (
            <button key={a.id} onDoubleClick={() => addToTimeline(a)} title={usable(a) ? "Double-click to add to timeline" : STATUS[a.status ?? ""]} className="group text-left">
              <div className="relative aspect-video overflow-hidden rounded-[8px] bg-bg-deep ring-1 ring-white/5 transition group-hover:ring-accent/50">
                <AssetThumb asset={a} />
                {a.durationFrames > 0 && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 font-mono text-[9px] text-white/80">{(a.durationFrames / FPS).toFixed(0)}s</span>
                )}
                {a.bpm ? <span className="absolute bottom-1 left-1 rounded bg-sun px-1 font-mono text-[9px] font-bold text-black">{Math.round(a.bpm)} BPM</span> : null}
                {usage(a.id) > 0 && <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-green-text" title="Used in timeline" />}
                {a.status && a.status !== "ready" && (
                  <div className="absolute inset-0 grid place-items-center bg-black/60 text-[10px] font-semibold text-soft">
                    <div className="w-3/4 text-center">
                      {STATUS[a.status]}
                      {a.status === "uploading" ? "…" : a.status !== "failed" && a.status !== "offline" ? "…" : ""}
                      {a.status === "offline" && (
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRelinkId(a.id);
                            relinkRef.current?.click();
                          }}
                          className="mt-1.5 inline-block rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-ink"
                        >
                          Relink file
                        </span>
                      )}
                      {a.status !== "failed" && a.status !== "offline" && (
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
                          <div className={`h-full rounded-full bg-accent ${a.status !== "uploading" ? "w-1/2 animate-pulse" : ""}`} style={a.status === "uploading" ? { width: `${a.progress ?? 0}%` } : undefined} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {usable(a) && (
                  <span
                    role="button"
                    aria-label={`Add ${a.name} to timeline`}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToTimeline(a);
                    }}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Plus size={12} />
                  </span>
                )}
              </div>
              <p className="mt-1.5 truncate text-[12px] text-soft">{a.name}</p>
              <p className="truncate text-[10px] text-faint">{a.sizeLabel}</p>
            </button>
          ))}
        </div>
        {!shown.length && <p className="py-8 text-center text-[12px] text-faint">{assets.length ? "No media matches." : "Upload video, music or images to start."}</p>}
        <p className="mt-4 text-[11px] leading-relaxed text-faint">
          {projectId
            ? "Original media stays on this device. Only your edit and lightweight analysis sync. Re-link media on another device. Keep original files backed up; clearing this browser's site data can remove local copies."
            : "Demo mode: imported files stay on this device. Sign in to sync your edit; media itself remains local. Keep original files backed up."}
        </p>
      </div>
    </aside>
  );
}

function AssetThumb({ asset }: { asset: EditorAsset }) {
  if (asset.kind === "audio")
    return (
      <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#17652f,#062a14)] text-[#bdf5c8]">
        <Music size={20} />
      </div>
    );
  if (asset.thumbUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={asset.thumbUrl} alt="" className="h-full w-full object-cover" />;
  if (asset.photo) return <Photo photo={asset.photo} sizes="140px" />;
  if (asset.url && asset.kind === "video") return <video src={`${asset.url}#t=0.5`} muted preload="metadata" className="h-full w-full object-cover" />;
  if (asset.url && asset.kind === "image")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={asset.url} alt="" className="h-full w-full object-cover" />;
  return (
    <div className="grid h-full w-full place-items-center text-muted">
      <Film size={18} />
    </div>
  );
}
