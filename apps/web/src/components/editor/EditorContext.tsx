"use client";

import {
  applyBatch,
  canRedo as hCanRedo,
  canUndo as hCanUndo,
  commit,
  createHistory,
  current,
  redo as redoH,
  sequenceDuration,
  undo as undoH,
  type EditOperation,
  type History,
  type TimelineDocument,
  type ValidationError,
} from "@cinemind/timeline-engine";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { API_URL, api, getToken, type ProjectPayload, type RemoteAsset, type TimelineState } from "@/lib/api";
import { analyzeAudioLocal, analyzeVideoLocal, fingerprint, kindOf, loadLocal, probeLocal, requestPersistence, saveLocal } from "@/lib/localMedia";
import { FPS, SAMPLE_ASSETS, fromRemote, sampleTimeline, type EditorAsset } from "./model";

export interface Toast {
  id: number;
  kind: "ok" | "error" | "info";
  text: string;
}

type RunResult = { ok: true } | { ok: false; errors: ValidationError[] };

interface EditorState {
  /** Server project id, or null in demo mode. */
  projectId: string | null;
  title: string;
  loading: boolean;
  loadError: string | null;
  doc: TimelineDocument;
  assets: EditorAsset[];
  assetById: Map<string, EditorAsset>;
  selectedId: string | null;
  select: (id: string | null) => void;
  playhead: number;
  setPlayhead: (f: number) => void;
  playing: boolean;
  togglePlay: () => void;
  loop: boolean;
  setLoop: (v: boolean) => void;
  duration: number;
  zoom: number;
  setZoom: (z: number) => void;
  run: (ops: EditOperation[], label?: string) => RunResult;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  importFiles: (files: FileList | File[]) => void;
  relink: (assetId: string, file: File) => Promise<void>;
  getLocalFile: (assetId: string) => Promise<File | null>;
  toasts: Toast[];
  notify: (kind: Toast["kind"], text: string) => void;
  saving: boolean;
  /** Replace the timeline with an authoritative server state (e.g. after an AI approval). */
  applyServerState: (s: TimelineState) => void;
  refreshAssets: () => Promise<void>;
  /** Last server event, for panels that react to renders. */
  lastEvent: { type: string; payload: Record<string, unknown>; at: number } | null;
}

const Ctx = createContext<EditorState | null>(null);

export function useEditor() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEditor outside EditorProvider");
  return v;
}

let toastSeq = 0;

export function EditorProvider({ projectId, title: initialTitle, aspect, children }: { projectId: string | null; title: string; aspect: string; children: ReactNode }) {
  const remote = !!projectId;
  const [title, setTitle] = useState(initialTitle);
  const [loading, setLoading] = useState(remote);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [history, setHistory] = useState<History>(() => createHistory(sampleTimeline("demo", aspect)));
  const [server, setServer] = useState<{ canUndo: boolean; canRedo: boolean }>({ canUndo: false, canRedo: false });
  const [assets, setAssets] = useState<EditorAsset[]>(remote ? [] : SAMPLE_ASSETS);
  const [uploads, setUploads] = useState<EditorAsset[]>([]);
  const [selectedId, select] = useState<string | null>(null);
  const [playhead, setPlayheadRaw] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [zoom, setZoom] = useState(1.2);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastEvent, setLastEvent] = useState<EditorState["lastEvent"]>(null);

  const doc = current(history);
  const duration = Math.max(sequenceDuration(doc), 10 * FPS);
  const allAssets = useMemo(() => [...uploads, ...assets], [uploads, assets]);
  const assetById = useMemo(() => new Map(allAssets.map((a) => [a.id, a])), [allAssets]);

  const notify = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastSeq;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const setPlayhead = useCallback((f: number) => setPlayheadRaw(Math.max(0, Math.round(f))), []);

  // Refs mirror state for callbacks that must not go stale.
  const historyRef = useRef(history);
  const assetsRef = useRef(allAssets);
  const serverDocRef = useRef<TimelineDocument | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  useLayoutEffect(() => {
    historyRef.current = history;
    assetsRef.current = allAssets;
  });

  const applyServerState = useCallback((s: TimelineState) => {
    serverDocRef.current = s.timeline;
    const h = createHistory(s.timeline);
    historyRef.current = h;
    setHistory(h);
    setServer({ canUndo: s.canUndo, canRedo: s.canRedo });
  }, []);

  // ---- Load project ----
  /** Attach this device's copies (OPFS) to server metadata; missing files show as offline. */
  const withLocalFiles = useCallback(
    async (items: RemoteAsset[]): Promise<EditorAsset[]> => {
      if (!projectId) return items.map(fromRemote);
      return Promise.all(
        items.map(async (r) => {
          const a = fromRemote(r);
          const [file, thumb] = await Promise.all([loadLocal(projectId, r.id), loadLocal(projectId, `${r.id}.thumb.jpg`)]);
          if (!file) return { ...a, url: undefined, status: "offline" as const };
          return { ...a, location: "device" as const, url: URL.createObjectURL(file), thumbUrl: thumb ? URL.createObjectURL(thumb) : r.kind === "image" ? URL.createObjectURL(file) : null, sizeLabel: `${a.sizeLabel} · this device` };
        }),
      );
    },
    [projectId],
  );

  const refreshAssets = useCallback(async () => {
    if (!projectId) return;
    const r = await api<{ items: RemoteAsset[] }>("GET", `/projects/${projectId}/media`);
    setAssets(await withLocalFiles(r.items));
  }, [projectId, withLocalFiles]);

  useEffect(() => {
    if (!projectId) return;
    if (!getToken()) {
      window.location.assign(`/login?next=${encodeURIComponent(`/editor?project=${projectId}`)}`);
      return;
    }
    let cancelled = false;
    api<ProjectPayload>("GET", `/projects/${projectId}`)
      .then(async (p) => {
        const local = await withLocalFiles(p.assets);
        if (cancelled) return;
        setTitle(p.project.title);
        setAssets(local);
        applyServerState(p);
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, applyServerState, withLocalFiles]);

  // ---- Live server events (SSE) ----
  useEffect(() => {
    if (!projectId) return;
    const token = getToken();
    if (!token) return;
    const es = new EventSource(`${API_URL}/api/v1/projects/${projectId}/events?token=${encodeURIComponent(token)}`);
    const onMedia = () => void refreshAssets().catch(() => {});
    const handler = (type: string) => (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setLastEvent({ type, payload: data.payload ?? {}, at: Date.now() });
      if (type.startsWith("media.")) onMedia();
    };
    const types = ["media.probed", "media.ready", "media.analysis.completed", "media.failed", "render.progress", "render.completed", "render.failed", "render.cancelled"];
    const listeners = types.map((t) => [t, handler(t)] as const);
    for (const [t, h] of listeners) es.addEventListener(t, h as EventListener);
    return () => es.close();
  }, [projectId, refreshAssets]);

  // ---- Edits ----
  const run = useCallback<EditorState["run"]>(
    (ops, label) => {
      const h = historyRef.current;
      const res = applyBatch(current(h), { expectedVersion: current(h).version, operations: ops }, assetsRef.current);
      if (!res.ok) {
        notify("error", res.errors[0]?.message ?? "Edit rejected.");
        return { ok: false, errors: res.errors };
      }
      const next = commit(h, res.document);
      historyRef.current = next;
      setHistory(next);
      if (label) notify("ok", label);

      if (projectId) {
        // Serialise writes; each uses the latest server version for optimistic concurrency.
        setSaving(true);
        queueRef.current = queueRef.current.then(async () => {
          try {
            const base = serverDocRef.current!;
            const s = await api<TimelineState>("POST", `/projects/${projectId}/timeline/operations`, { expectedVersion: base.version, operations: ops });
            serverDocRef.current = s.timeline;
            setServer({ canUndo: s.canUndo, canRedo: s.canRedo });
            // Adopt the server document (it owns ids and version numbers) unless more local edits are queued.
            if (historyRef.current === next) applyServerState(s);
          } catch (e) {
            notify("error", (e as Error).message);
            const s = await api<TimelineState>("GET", `/projects/${projectId}`).catch(() => null);
            if (s) applyServerState(s);
          } finally {
            setSaving(false);
          }
        });
      }
      return { ok: true };
    },
    [notify, projectId, applyServerState],
  );

  const undo = useCallback(() => {
    if (!projectId) return setHistory((h) => undoH(h));
    queueRef.current = queueRef.current.then(() =>
      api<TimelineState>("POST", `/projects/${projectId}/timeline/undo`).then(applyServerState, (e) => notify("error", e.message)),
    );
  }, [projectId, applyServerState, notify]);
  const redo = useCallback(() => {
    if (!projectId) return setHistory((h) => redoH(h));
    queueRef.current = queueRef.current.then(() =>
      api<TimelineState>("POST", `/projects/${projectId}/timeline/redo`).then(applyServerState, (e) => notify("error", e.message)),
    );
  }, [projectId, applyServerState, notify]);

  // ---- Playback clock ----
  const playheadRef = useRef(playhead);
  const durationRef = useRef(duration);
  const loopRef = useRef(loop);
  useLayoutEffect(() => {
    playheadRef.current = playhead;
    durationRef.current = duration;
    loopRef.current = loop;
  });
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let pos = playheadRef.current;
    const tick = (now: number) => {
      pos += ((now - last) / 1000) * FPS;
      last = now;
      if (pos >= durationRef.current) {
        if (loopRef.current) {
          // Repeat from the start without stopping playback.
          pos = 0;
          setPlayheadRaw(0);
          raf = requestAnimationFrame(tick);
          return;
        }
        setPlayheadRaw(durationRef.current);
        setPlaying(false);
        return;
      }
      setPlayheadRaw(Math.floor(pos));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && playheadRef.current >= durationRef.current - 1) setPlayheadRaw(0);
      return !p;
    });
  }, []);

  // ---- Local-first media (files never leave this device) ----
  const patchAsset = useCallback((id: string, p: Partial<EditorAsset>) => setAssets((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x))), []);

  /** Analyse on-device, keep the thumbnail locally, send only the small analysis JSON. */
  const analyseOnDevice = useCallback(
    async (assetId: string, file: File, kind: EditorAsset["kind"], durationSec: number) => {
      if (!projectId) return;
      patchAsset(assetId, { status: "analyzing" });
      const audio = kind !== "image" ? await analyzeAudioLocal(file) : null;
      const video = kind === "video" ? await analyzeVideoLocal(file, durationSec) : null;
      let thumbUrl: string | null = null;
      if (video?.thumb) {
        await saveLocal(projectId, `${assetId}.thumb.jpg`, video.thumb);
        thumbUrl = URL.createObjectURL(video.thumb);
      } else if (kind === "image") thumbUrl = URL.createObjectURL(file);
      await api("PUT", `/projects/${projectId}/media/${assetId}/analysis`, { audio, scenes: video?.scenes ?? null }).catch(() => {});
      patchAsset(assetId, {
        status: "ready",
        thumbUrl,
        bpm: audio?.bpm ?? null,
        beats: audio?.beats,
        peaks: audio?.peaks,
        peaksPerSecond: audio?.peaksPerSecond,
        hasAudio: !!audio,
      });
      if (audio?.bpm) notify("ok", `${file.name}: ${audio.bpm} BPM detected`);
    },
    [projectId, patchAsset, notify],
  );

  const importToDevice = useCallback(
    async (file: File) => {
      if (!projectId) return;
      const tempId = `imp_${++toastSeq}`;
      const kind = kindOf(file)!;
      setUploads((u) => [{ id: tempId, kind, name: file.name, durationFrames: 0, status: "uploading", progress: 30, sizeLabel: `${(file.size / 1e6).toFixed(1)} MB` }, ...u]);
      try {
        const probe = await probeLocal(file);
        const fp = await fingerprint(file);
        setUploads((u) => u.map((x) => (x.id === tempId ? { ...x, progress: 60 } : x)));
        const a = await api<RemoteAsset>("POST", `/projects/${projectId}/media/register`, {
          name: file.name,
          kind: probe.kind,
          mimeType: file.type,
          sizeBytes: file.size,
          fingerprint: fp,
          durationFrames: Math.max(1, Math.round(probe.durationSec * FPS)),
          width: probe.width,
          height: probe.height,
          hasAudio: probe.kind !== "image",
        });
        await saveLocal(projectId, a.id, file);
        const protectedStorage = await requestPersistence();
        if (!protectedStorage) notify("info", "Media stayed on this device, but the browser could not guarantee it will survive storage cleanup. Keep your original files backed up.");
        const local = await loadLocal(projectId, a.id);
        setUploads((u) => u.filter((x) => x.id !== tempId));
        setAssets((xs) => [{ ...fromRemote(a), location: "device", url: URL.createObjectURL(local ?? file), status: "analyzing", sizeLabel: `${(file.size / 1e6).toFixed(1)} MB · this device` }, ...xs.filter((x) => x.id !== a.id)]);
        notify("ok", `Added ${file.name} — stored on this device`);
        await analyseOnDevice(a.id, local ?? file, probe.kind, probe.durationSec);
      } catch (e) {
        setUploads((u) => u.filter((x) => x.id !== tempId));
        const error = e as Error;
        notify("error", error.name === "QuotaExceededError" ? `${file.name}: device storage is full. Free space and try again.` : `${file.name}: ${error.message}`);
      }
    },
    [projectId, notify, analyseOnDevice],
  );

  /** Re-attach a device file to an asset that is offline here (e.g. project opened on a new device). */
  const relink = useCallback(
    async (assetId: string, file: File) => {
      if (!projectId) return;
      const a = assetsRef.current.find((x) => x.id === assetId);
      const fp = await fingerprint(file);
      if (a?.fingerprint && a.fingerprint !== fp) {
        notify("error", `${file.name} is not the same file as “${a.name}”.`);
        return;
      }
      try {
        await saveLocal(projectId, assetId, file);
      } catch (e) {
        const error = e as Error;
        notify("error", error.name === "QuotaExceededError" ? "Device storage is full. Free space and try relinking." : `Could not store this media locally: ${error.message}`);
        return;
      }
      patchAsset(assetId, { location: "device", url: URL.createObjectURL(file), status: "ready" });
      notify("ok", `Relinked ${a?.name ?? file.name}`);
      const probe = await probeLocal(file).catch(() => null);
      if (probe && a?.kind === "video") {
        const v = await analyzeVideoLocal(file, probe.durationSec);
        if (v.thumb) {
          await saveLocal(projectId, `${assetId}.thumb.jpg`, v.thumb);
          patchAsset(assetId, { thumbUrl: URL.createObjectURL(v.thumb) });
        }
      }
    },
    [projectId, notify, patchAsset],
  );

  // Resume on-device analysis that didn't finish last time (closed tab, network error…).
  const resumed = useRef(false);
  useEffect(() => {
    if (loading || !projectId || resumed.current) return;
    resumed.current = true;
    const pending = assetsRef.current.filter((a) => a.location === "device" && a.status === "analyzing" && a.url);
    (async () => {
      for (const a of pending) {
        const file = await loadLocal(projectId, a.id);
        if (file) await analyseOnDevice(a.id, file, a.kind, a.durationFrames / FPS);
      }
    })();
  }, [loading, projectId, analyseOnDevice]);

  const getLocalFile = useCallback(async (assetId: string) => (projectId ? loadLocal(projectId, assetId) : null), [projectId]);

  // ---- Import ----
  const importFiles = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("image/") ? "image" : null;
        if (!kind) {
          notify("error", `${file.name}: unsupported file type.`);
          continue;
        }
        if (projectId) {
          void importToDevice(file);
          continue;
        }
        // Demo mode: play straight from this device.
        const url = URL.createObjectURL(file);
        const id = `a_local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const add = (durationFrames: number) => {
          setAssets((a) => [{ id, kind, name: file.name, durationFrames, url, local: true, sizeLabel: `${(file.size / 1e6).toFixed(1)} MB · this device` }, ...a]);
          notify("ok", `Imported ${file.name}`);
        };
        if (kind === "image") {
          add(5 * FPS);
          continue;
        }
        const el = document.createElement(kind);
        el.preload = "metadata";
        el.onloadedmetadata = () => add(Math.max(1, Math.floor((isFinite(el.duration) ? el.duration : 10) * FPS)));
        el.onerror = () => notify("error", `${file.name}: this browser can't decode it. Try a supported format such as MP4 (H.264). Your media is not uploaded.`);
        el.src = url;
      }
    },
    [notify, projectId, importToDevice],
  );

  // Development-only hook so automated tests can import files without a file picker.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __cmImport?: typeof importFiles }).__cmImport = importFiles;
  }, [importFiles]);

  const value: EditorState = {
    relink,
    getLocalFile,
    projectId,
    title,
    loading,
    loadError,
    doc,
    assets: allAssets,
    assetById,
    selectedId,
    select,
    playhead,
    setPlayhead,
    playing,
    togglePlay,
    loop,
    setLoop,
    duration,
    zoom,
    setZoom,
    run,
    undo,
    redo,
    canUndo: remote ? server.canUndo || hCanUndo(history) : hCanUndo(history),
    canRedo: remote ? server.canRedo : hCanRedo(history),
    importFiles,
    toasts,
    notify,
    saving,
    applyServerState,
    refreshAssets,
    lastEvent,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
