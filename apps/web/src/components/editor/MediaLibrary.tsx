"use client";

import { clipEnd } from "@cinemind/timeline-engine";
import { useRef, useState } from "react";
import { Photo } from "@/components/visual/Photo";
import { Film, Music, Plus, TextIcon, Upload } from "@/components/ui/icons";
import { useEditor } from "./EditorContext";
import { VoiceRecorder } from "./VoiceRecorder";
import { FPS, type EditorAsset } from "./model";

type Tab = "media" | "audio" | "text" | "elements";

const STATUS: Record<string, string> = {
  uploading: "Adding",
  offline: "Offline on this device",
  uploaded: "Queued",
  processing: "Processing",
  analyzing: "Analysing",
  failed: "Failed",
};

export function MediaLibrary() {
  const { assets, importFiles, doc, run, playhead, projectId, relink, selectedId, select, notify } = useEditor();
  const relinkRef = useRef<HTMLInputElement>(null);
  const [relinkId, setRelinkId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("media");
  const [query, setQuery] = useState("");
  const [over, setOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = assets.filter((a) => (tab === "audio" ? a.kind === "audio" : tab === "media" ? a.kind !== "audio" : false) && a.name.toLowerCase().includes(query.toLowerCase()));

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

  const addTransition = (kind: "dissolve" | "fade" | "dip-to-black") => {
    const videoTracks = doc.tracks.filter((t) => t.kind === "video");
    const selectedTrack = videoTracks.find((t) => t.clips.some((c) => c.id === selectedId));
    const track = selectedTrack ?? videoTracks.find((t) => t.clips.length >= 2);
    const clips = track?.clips ?? [];
    const index = selectedTrack ? clips.findIndex((c) => c.id === selectedId) : clips.length - 2;
    const from = clips[index];
    const to = clips[index + 1];
    if (!from || !to) {
      notify("error", "Add another video clip after this one before adding a transition.");
      return;
    }
    const durationFrames = Math.min(from.sourceOutFrames - from.sourceInFrames, to.sourceOutFrames - to.sourceInFrames, Math.floor(FPS / 2));
    run([{ type: "transition.add", fromClipId: from.id, toClipId: to.id, kind, durationFrames }], `Added ${kind} transition`);
  };

  const importSelection = (files: FileList | File[]) => {
    const selected = Array.from(files).filter((file) => tab === "audio" ? file.type.startsWith("audio/") : file.type.startsWith("video/") || file.type.startsWith("image/"));
    if (!selected.length) {
      notify("error", tab === "audio" ? "Choose an audio file such as MP3 or WAV." : "Choose a video or image file.");
      return;
    }
    importFiles(selected);
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
        if (e.dataTransfer.files.length) importSelection(e.dataTransfer.files);
      }}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3 text-[12px]">
        <span className="font-semibold text-soft">Project bin</span>
        <span className="text-faint">{tab === "text" ? doc.tracks.filter((t) => t.kind === "text").reduce((n, t) => n + t.clips.length, 0) : assets.length} items</span>
      </div>
      <div className="grid shrink-0 grid-cols-4 gap-1 border-b border-line p-1.5">
        {([ ["media", "Media"], ["audio", "Audio"], ["text", "Text"], ["elements", "Elements"] ] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-md py-2 text-[10px] font-semibold transition ${tab === id ? "bg-accent/10 text-accent" : "text-muted hover:bg-white/5 hover:text-text"}`}>{label}</button>)}
      </div>
      <div className="space-y-3 p-3">
        {(tab === "media" || tab === "audio") && <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-line-strong py-3 text-[13px] font-semibold text-soft transition-colors hover:border-accent/60 hover:text-accent"><Upload size={15} /> {tab === "audio" ? "Import audio" : "Import video or image"}</button>}
        {(tab === "media" || tab === "audio") && <button onClick={() => setRecording(true)} className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-line py-2 text-[12px] font-semibold text-soft transition-colors hover:border-danger/60 hover:text-danger"><span className="h-2.5 w-2.5 rounded-full bg-danger" /> Record voice-over</button>}
        {recording && <VoiceRecorder onClose={() => setRecording(false)} onDone={(f) => importFiles([f])} />}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={tab === "audio" ? "audio/*" : "video/*,image/*"}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) importSelection(e.target.files);
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
        {(tab === "media" || tab === "audio") && <p className="text-[10px] text-faint">Select a clip below to add it to your timeline.</p>}
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {(tab === "media" || tab === "audio") && <div className="space-y-2">
          {shown.map((a) => (
            <div key={a.id} className="group flex min-w-0 items-center gap-2 overflow-hidden rounded-[9px] border border-line bg-bg-deep transition hover:border-accent/50">
              <div className="relative h-[62px] w-[92px] shrink-0 overflow-hidden">
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRelinkId(a.id);
                            relinkRef.current?.click();
                          }}
                          className="mt-1.5 inline-block rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-ink"
                        >
                          Relink file
                        </button>
                      )}
                      {a.status !== "failed" && a.status !== "offline" && (
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
                          <div className={`h-full rounded-full bg-accent ${a.status !== "uploading" ? "w-1/2 animate-pulse" : ""}`} style={a.status === "uploading" ? { width: `${a.progress ?? 0}%` } : undefined} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 p-2">
                <p className="truncate text-[11px] font-semibold text-soft" title={a.name}>{a.name}</p>
                <p className="truncate text-[10px] text-faint">{a.sizeLabel}</p>
                {usable(a) && <button type="button" onClick={() => addToTimeline(a)} className="mt-2 flex min-h-8 w-full items-center justify-center gap-1 rounded-md bg-accent/10 px-2 text-[10px] font-bold text-accent transition hover:bg-accent hover:text-accent-ink"><Plus size={12} /> Add to timeline</button>}
              </div>
            </div>
          ))}
        </div>}
        {(tab === "media" || tab === "audio") && !shown.length && <p className="py-8 text-center text-[12px] text-faint">{assets.length ? "No media matches." : tab === "audio" ? "Import music or record a voice-over to start." : "Import a video or image to start."}</p>}
        {tab === "text" && <div className="space-y-3 pt-2"><button onClick={addTitle} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-[12px] font-bold text-accent-ink"><TextIcon size={15} /> Add title at playhead</button>{doc.tracks.filter((t) => t.kind === "text").flatMap((t) => t.clips.map((c) => <button key={c.id} onClick={() => select(c.id)} className={`w-full rounded-lg border p-3 text-left text-[12px] ${selectedId === c.id ? "border-accent bg-accent/10 text-accent" : "border-line text-soft"}`}>{c.text || "Untitled text"}</button>))}<p className="text-[11px] text-faint">Select a title on the timeline to edit its text, timing, position and style in Inspector.</p></div>}
        {tab === "elements" && <div className="space-y-3 pt-2"><p className="text-[11px] leading-relaxed text-muted">Transitions join adjacent video clips. Select a clip on the timeline, then apply a transition to the next clip.</p>{([ ["dissolve", "Cross dissolve"], ["fade", "Fade through"], ["dip-to-black", "Dip to black"] ] as const).map(([kind, label]) => <button key={kind} onClick={() => addTransition(kind)} className="w-full rounded-lg border border-line bg-surface-2 p-3 text-left text-[12px] font-semibold text-soft hover:border-accent/50 hover:text-accent">{label}<span className="mt-1 block text-[10px] font-normal text-faint">Add between adjacent clips</span></button>)}</div>}
        <p className="mt-4 text-[11px] leading-relaxed text-faint">
          {(tab === "media" || tab === "audio") && (projectId
            ? "Original media stays on this device. Only your edit and lightweight analysis sync. Re-link media on another device. Keep original files backed up; clearing this browser's site data can remove local copies."
            : "Demo mode: imported files stay on this device. Sign in to sync your edit; media itself remains local. Keep original files backed up.")}
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
