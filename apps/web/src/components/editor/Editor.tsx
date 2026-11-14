"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/brand/Logo";
import { Check, Export, Film, Moon, Music, Redo, Sun, Undo, X } from "@/components/ui/icons";
import { renderLocally } from "@/lib/localRender";
import { EditorProvider, useEditor } from "./EditorContext";
import { MediaLibrary } from "./MediaLibrary";
import { Preview } from "./Preview";
import { SidePanel } from "./SidePanel";
import { Timeline } from "./Timeline";

export function Editor() {
  const params = useSearchParams();
  const projectId = params.get("project");
  const title = params.get("title") || "Untitled project";
  const aspect = params.get("aspect") || "16:9";
  return (
    <EditorProvider key={projectId ?? "demo"} projectId={projectId} title={title} aspect={aspect}>
      <Shell />
    </EditorProvider>
  );
}

function Shell() {
  const { togglePlay, undo, redo, selectedId, run, playhead, setPlayhead, doc, toasts, loading, loadError } = useEditor();
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [smallScreenTab, setSmallScreenTab] = useState<"edit" | "media" | "inspector" | "cine">("edit");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cinemind-editor-theme");
      const next = stored === "light" ? "light" : "dark";
      setTheme(next);
      document.documentElement.dataset.theme = next;
    } catch { /* Theme preferences are optional when storage is unavailable. */ }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("cinemind-editor-theme", next); } catch { /* The current view still changes. */ }
  };

  // Keyboard shortcuts (spec §4.2).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        run([{ type: "clip.delete", clipId: selectedId }], "Deleted clip");
      } else if (e.key.toLowerCase() === "s" && !mod) {
        const all = doc.tracks.flatMap((t) => t.clips);
        const inside = (x: (typeof all)[number]) => playhead > x.timelineStartFrames && playhead < x.timelineStartFrames + (x.sourceOutFrames - x.sourceInFrames);
        const c = all.find((x) => x.id === selectedId && inside(x)) ?? all.find(inside);
        if (c) run([{ type: "clip.split", clipId: c.id, atTimelineFrame: playhead }], "Split clip");
      } else if (e.key === "ArrowLeft") {
        setPlayhead(playhead - (e.shiftKey ? 30 : 1));
      } else if (e.key === "ArrowRight") {
        setPlayhead(playhead + (e.shiftKey ? 30 : 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const cuts = [...new Set(doc.tracks.flatMap((t) => t.clips.flatMap((c) => [c.timelineStartFrames, c.timelineStartFrames + c.sourceOutFrames - c.sourceInFrames])))].sort((a, b) => a - b);
        const target = e.key === "ArrowDown" ? cuts.find((c) => c > playhead) : [...cuts].reverse().find((c) => c < playhead);
        if (target !== undefined) setPlayhead(target);
      } else if (mod && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault();
        const track = doc.tracks.find((t) => t.clips.some((c) => c.id === selectedId))!;
        const clip = track.clips.find((c) => c.id === selectedId)!;
        const end = Math.max(...track.clips.map((c) => c.timelineStartFrames + c.sourceOutFrames - c.sourceInFrames));
        if (track.kind === "text") run([{ type: "title.add", trackId: track.id, text: clip.text ?? "Title", startFrame: end, durationFrames: clip.sourceOutFrames - clip.sourceInFrames }], "Duplicated title");
        else if (clip.assetId) run([{ type: "clip.insert", assetId: clip.assetId, trackId: track.id, timelineStartFrames: end, sourceInFrames: clip.sourceInFrames, sourceOutFrames: clip.sourceOutFrames }], "Duplicated clip");
      } else if (e.key === "?") {
        setHelpOpen((h) => !h);
      } else if (e.key === "Escape") {
        setHelpOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, undo, redo, selectedId, run, playhead, setPlayhead, doc]);

  if (loading || loadError)
    return (
      <div className="grid h-[100dvh] place-items-center bg-bg text-center">
        <div>
          <div className={`tz-stripe mx-auto h-1 w-24 rounded-full ${loading ? "animate-pulse" : ""}`} />
          <p className="mt-5 text-[14px] text-soft">{loadError ?? "Opening project…"}</p>
          {loadError && (
            <Link href="/projects" className="link-arrow mt-4">
              Back to projects
            </Link>
          )}
        </div>
      </div>
    );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg text-text">
      <TopBar onExport={() => setExportOpen(true)} theme={theme} onToggleTheme={toggleTheme} />
      <div className="hidden min-h-0 flex-[1.25] xl:grid xl:grid-cols-[64px_250px_minmax(0,1fr)_310px] 2xl:grid-cols-[190px_290px_minmax(0,1fr)_360px]">
        <EditorNavigation />
        <MediaLibrary />
        <Preview onOpenMedia={() => setSmallScreenTab("media")} />
        <SidePanel initialTab="cine" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col xl:hidden">
        <nav aria-label="Editor workspace" className="grid h-11 shrink-0 grid-cols-4 border-b border-line bg-surface px-2">
          {([ ["media", "Media"], ["edit", "Preview"], ["inspector", "Edit"], ["cine", "Cine · AI"] ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSmallScreenTab(id)} className={`relative text-[12px] font-semibold ${smallScreenTab === id ? "text-accent" : "text-muted"}`}>
              {label}
              {smallScreenTab === id && <span className="absolute inset-x-5 bottom-0 h-0.5 rounded bg-accent" />}
            </button>
          ))}
        </nav>
        <div className="min-h-0 flex-1">
          {smallScreenTab === "media" ? <MediaLibrary /> : smallScreenTab === "cine" ? <SidePanel initialTab="cine" /> : smallScreenTab === "inspector" ? <SidePanel initialTab="inspector" /> : <Preview onOpenMedia={() => setSmallScreenTab("media")} />}
        </div>
      </div>
      <div className="flex min-h-[170px] max-h-[40dvh] flex-[0.72] flex-col xl:min-h-[230px] xl:max-h-none xl:flex-1">
        <Timeline />
      </div>
      <StatusBar />
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
      <div className="pointer-events-none fixed bottom-12 left-1/2 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2 xl:bottom-10">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`fade-up rounded-full border px-4 py-2 text-[12px] shadow-xl backdrop-blur ${
              t.kind === "error" ? "border-danger/40 bg-[#2a1714]/95 text-[#ffb3a8]" : "border-line-strong bg-surface-2/95 text-soft"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorNavigation() {
  return (
    <nav aria-label="Main navigation" className="flex min-h-0 flex-col border-r border-line bg-surface px-2 py-4 2xl:px-3">
      <Link href="/" className="mb-6 flex items-center gap-2 px-1 2xl:px-2" aria-label="CineMind home">
        <LogoMark size={28} />
        <span className="hidden 2xl:block"><span className="block text-[13px] font-bold leading-tight">CineMind AI</span><span className="text-[10px] text-muted">Create · Edit · Inspire</span></span>
      </Link>
      <div className="space-y-1">
        <NavLink href="/" label="Home"><span aria-hidden="true">⌂</span></NavLink>
        <NavLink href="/editor" label="Editor" active><Film size={17} /></NavLink>
        <NavLink href="/projects" label="Projects"><span aria-hidden="true">▰</span></NavLink>
      </div>
      <div className="mt-auto rounded-xl border border-line bg-surface-2 p-2 text-center 2xl:p-3">
        <span className="text-accent"><Music size={18} /></span>
        <p className="mt-1 hidden text-[11px] font-semibold text-soft 2xl:block">Your media stays local</p>
      </div>
    </nav>
  );
}

function NavLink({ href, label, children, active = false }: { href: string; label: string; children: React.ReactNode; active?: boolean }) {
  return <Link href={href} aria-current={active ? "page" : undefined} title={label} className={`flex h-10 items-center justify-center gap-3 rounded-lg px-2 text-[12px] font-semibold transition-colors 2xl:justify-start 2xl:px-3 ${active ? "bg-accent/10 text-accent" : "text-muted hover:bg-white/5 hover:text-text"}`}><span className="grid w-5 place-items-center text-base">{children}</span><span className="hidden 2xl:block">{label}</span></Link>;
}

function TopBar({ onExport, theme, onToggleTheme }: { onExport: () => void; theme: "dark" | "light"; onToggleTheme: () => void }) {
  const { title, undo, redo, canUndo, canRedo, doc, saving, projectId } = useEditor();
  return (
    <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 sm:gap-4 sm:px-4">
      <div className="tz-stripe absolute inset-x-0 top-0 h-[2px]" />
      <Link href="/projects" className="flex items-center gap-2" title="All projects">
        <LogoMark size={24} />
      </Link>
      <span className="h-5 w-px bg-line" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold leading-tight">{title}</p>
        <p className="text-[11px] leading-tight text-faint">{!projectId ? "Local draft · not synced" : saving ? "Syncing edit…" : `Edit synced · media local · v${doc.version}`}</p>
      </div>
      <div className="ml-1 flex items-center gap-0.5 sm:ml-4">
        <button title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!canUndo} onClick={undo} className="grid h-8 w-8 place-items-center rounded text-soft hover:bg-white/5 disabled:opacity-30">
          <Undo size={16} />
        </button>
        <button title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={!canRedo} onClick={redo} className="grid h-8 w-8 place-items-center rounded text-soft hover:bg-white/5 disabled:opacity-30">
          <Redo size={16} />
        </button>
      </div>
      <span className="ml-auto" />
      <span className="hidden text-[12px] text-faint 2xl:inline">Space play · S split · ? shortcuts</span>
      <button onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-soft hover:border-accent/50 hover:text-accent">{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
      {!projectId && (
        <Link href="/signup" className="hidden rounded-full border border-line-strong px-3 py-1 text-[12px] text-soft hover:border-accent/60 hover:text-text sm:inline-flex">
          Sign up to save
        </Link>
      )}
      <button onClick={onExport} className="btn-primary !gap-1.5 !px-2.5 !py-1.5 text-[12px] sm:!gap-2 sm:!px-4 sm:text-[13px]">
        <Export size={15} /> <span className="hidden sm:inline">Export</span>
      </button>
    </header>
  );
}

function StatusBar() {
  const { doc, assets, duration, projectId } = useEditor();
  const clips = doc.tracks.reduce((n, t) => n + t.clips.length, 0);
  return (
    <footer className="flex h-6 shrink-0 items-center gap-5 border-t border-line bg-surface px-4 text-[11px] text-faint">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${projectId ? "bg-ok" : "bg-sun"}`} /> <span className="hidden sm:inline">{projectId ? "Connected · media stays on device" : "Local draft · media stays on device"}</span><span className="sm:hidden">{projectId ? "Local media" : "Local draft"}</span>
      </span>
      <span>
        {clips} clips · {assets.length} media
      </span>
      <span className="hidden sm:inline">{(duration / 30).toFixed(1)}s sequence</span>
      <span className="ml-auto hidden sm:inline">CineMind · Dar es Salaam</span>
    </footer>
  );
}

const PRESETS = [
  { id: "yt1080", name: "YouTube 1080p", spec: "1920×1080 · H.264 · AAC" },
  { id: "vertical", name: "Vertical social", spec: "1080×1920 · TikTok, Reels, Status" },
  { id: "square", name: "Square social", spec: "1080×1080 · H.264 · AAC" },
  { id: "master", name: "High-quality master", spec: "Sequence size · high bitrate" },
  { id: "draft", name: "Quick draft", spec: "960×540 · fastest" },
];
function ExportDialog({ onClose }: { onClose: () => void }) {
  const { doc, title, projectId, assetById, getLocalFile, notify } = useEditor();
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [state, setState] = useState<{ pct: number; stage: string } | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usedIds = [...new Set(doc.tracks.flatMap((t) => t.clips.map((c) => c.assetId)).filter(Boolean))] as string[];
  const offline = usedIds.filter((id) => {
    const a = assetById.get(id);
    return !a || a.status === "offline" || (!a.url && !a.photo);
  });
  const demoOnly = usedIds.some((id) => !!assetById.get(id)?.photo);

  const start = async () => {
    setError(null);
    setResult(null);
    try {
      const files = new Map<string, { file: Blob; kind: "video" | "audio" | "image"; hasAudio: boolean; ext: string }>();
      for (const id of usedIds) {
        const a = assetById.get(id)!;
        let file: Blob | null = projectId ? await getLocalFile(id) : null;
        if (!file && a.url) file = await fetch(a.url).then((r) => r.blob());
        if (!file) throw new Error(`“${a.name}” is not on this device.`);
        const ext = (a.name.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? (a.kind === "audio" ? ".mp3" : a.kind === "image" ? ".jpg" : ".mp4")).toLowerCase();
        files.set(id, { file, kind: a.kind, hasAudio: a.kind !== "image" && a.hasAudio !== false, ext });
      }
      const blob = await renderLocally({ doc, presetId: preset, files, onProgress: (pct, stage) => setState({ pct, stage }) });
      const name = `${title.replace(/[^\w-]+/g, "-").replace(/-+$/, "").toLowerCase()}-v${doc.version}.mp4`;
      setResult({ url: URL.createObjectURL(blob), name, size: blob.size });
      notify("ok", "Export finished on this device");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setState(null);
    }
  };

  const downloadProject = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^\w-]+/g, "-").toLowerCase()}-v${doc.version}.cinemind.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const disabled = !!state || !usedIds.length || offline.length > 0 || demoOnly;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => !state && onClose()}>
      <div className="fade-up w-full max-w-[560px] overflow-hidden rounded-[16px] border border-line-strong bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="tz-stripe h-1" />
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-[18px] font-semibold tracking-[-0.01em]">Export</h2>
            <p className="text-[12px] text-muted">Renders version {doc.version} on this device. Your source media never leaves it.</p>
          </div>
          <button aria-label="Close" disabled={!!state} onClick={onClose} className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-white/5 disabled:opacity-30">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button key={p.id} disabled={!!state} onClick={() => setPreset(p.id)} className={`rounded-[10px] border p-3 text-left transition-colors ${preset === p.id ? "border-accent bg-accent/[0.08]" : "border-line hover:border-line-strong"}`}>
                <p className="text-[13px] font-semibold">{p.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">{p.spec}</p>
              </button>
            ))}
          </div>
          {demoOnly && (
            <p className="rounded-[10px] bg-white/[0.04] p-3 text-[12px] leading-relaxed text-muted">
              The demo uses illustrative stills. <Link href="/signup" className="text-accent">Create a free account</Link>, add your own footage and export real MP4s.
            </p>
          )}
          {offline.length > 0 && !demoOnly && (
            <p className="rounded-[10px] border border-sun/30 bg-sun/[0.07] p-3 text-[12px] text-sun">
              {offline.length} file{offline.length > 1 ? "s are" : " is"} offline on this device. Relink {offline.length > 1 ? "them" : "it"} in the media library to export.
            </p>
          )}
          {state && (
            <div className="rounded-[10px] border border-line bg-bg-deep p-3 text-[12px]">
              <div className="flex justify-between">
                <span>{state.stage}</span>
                <span className="font-mono text-muted">{state.pct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-green to-accent-strong transition-[width] duration-300" style={{ width: `${Math.max(3, state.pct)}%` }} />
              </div>
              <p className="mt-2 text-faint">Keep this tab open. Long projects render faster in the desktop app.</p>
            </div>
          )}
          {result && (
            <div className="flex items-center justify-between rounded-[10px] border border-green/40 bg-green/10 p-3 text-[12px]">
              <span className="flex items-center gap-2 text-green-text">
                <Check size={14} /> {result.name}{result.size !== undefined ? ` · ${(result.size / 1e6).toFixed(1)} MB` : " · ready"}
              </span>
              <a href={result.url} download={result.name} className="font-semibold text-text underline">
                Save MP4
              </a>
            </div>
          )}
          {error && <p className="rounded-[10px] border border-danger/40 bg-danger/10 p-3 text-[12px] text-[#ffb3a8]">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button onClick={downloadProject} className="btn-ghost !py-2 text-[13px]">
            Project file
          </button>
          <button disabled={disabled} onClick={start} className="btn-primary !py-2 text-[13px] disabled:opacity-40">
            {state ? "Rendering…" : "Render on this device"}
          </button>
        </div>
      </div>
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ["Space", "Play / pause"],
  ["← / →", "Step one frame (Shift: one second)"],
  ["↑ / ↓", "Jump to previous / next cut"],
  ["S", "Split at playhead"],
  ["Del", "Delete selected clip"],
  ["Ctrl+D", "Duplicate selected clip"],
  ["Ctrl+Z", "Undo"],
  ["Ctrl+Shift+Z / Ctrl+Y", "Redo"],
  ["?", "Show this list"],
];

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="fade-up w-full max-w-[420px] overflow-hidden rounded-[16px] border border-line-strong bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="tz-stripe h-1" />
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-[18px] font-semibold">Keyboard shortcuts</h2>
          <button aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-white/5">
            <X size={16} />
          </button>
        </div>
        <dl className="divide-y divide-line px-5 py-2 text-[13px]">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2.5">
              <dt className="text-soft">{v}</dt>
              <dd>
                <kbd className="rounded-[6px] border border-line-strong bg-bg-deep px-2 py-0.5 font-mono text-[11px] text-text">{k}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
