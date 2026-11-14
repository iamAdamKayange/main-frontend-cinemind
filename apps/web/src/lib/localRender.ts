"use client";

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { buildRenderArgs, PRESETS, type RenderAsset } from "@cinemind/render-graph";
import type { TimelineDocument } from "@cinemind/timeline-engine";

/**
 * On-device export: the same filter graph the server/desktop use, executed by FFmpeg compiled
 * to WebAssembly. Media never leaves the device.
 */
let ffmpeg: FFmpeg | null = null;

async function getFFmpeg() {
  if (!ffmpeg) {
    // Loaded at runtime (not bundled) so its module worker resolves relative to /ffmpeg/lib/.
    const libUrl = `${location.origin}/ffmpeg/lib/index.js`;
    const mod = (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ libUrl)) as { FFmpeg: new () => FFmpeg };
    const f = new mod.FFmpeg();
    await f.load({ coreURL: `${location.origin}/ffmpeg/ffmpeg-core.js`, wasmURL: `${location.origin}/ffmpeg/ffmpeg-core.wasm` });
    ffmpeg = f;
  }
  return ffmpeg;
}

export interface LocalRenderInput {
  doc: TimelineDocument;
  presetId: string;
  /** asset id → local file and metadata */
  files: Map<string, { file: Blob; kind: RenderAsset["kind"]; hasAudio: boolean; ext: string }>;
  onProgress: (pct: number, stage: string) => void;
}

export async function renderLocally({ doc, presetId, files, onProgress }: LocalRenderInput): Promise<Blob> {
  onProgress(1, "Loading render engine…");
  const ff = await getFFmpeg();
  const progress = ({ progress }: { progress: number }) => onProgress(Math.min(99, Math.max(5, Math.round(progress * 100))), "Rendering");
  ff.on("progress", progress);
  const logs: string[] = [];
  const log = ({ message }: { message: string }) => {
    logs.push(message);
    if (logs.length > 60) logs.shift();
  };
  ff.on("log", log);

  const written: string[] = [];
  try {
    onProgress(3, "Preparing media…");
    const assets = new Map<string, RenderAsset>();
    let i = 0;
    for (const [id, f] of files) {
      const name = `in${i++}${f.ext}`;
      await ff.writeFile(name, new Uint8Array(await f.file.arrayBuffer()));
      written.push(name);
      assets.set(id, { id, kind: f.kind, path: name, hasAudio: f.hasAudio });
    }
    const font = await fetch("/fonts/DejaVuSans-Bold.ttf").then((r) => r.arrayBuffer());
    await ff.writeFile("font.ttf", new Uint8Array(font));
    written.push("font.ttf");

    const preset = PRESETS[presetId] ?? PRESETS.yt1080;
    // WASM is single-threaded: favour speed.
    const fast = { ...preset, x264preset: "ultrafast" };
    const { args, titles } = buildRenderArgs(doc, assets, fast, "out.mp4", "font.ttf");
    for (const t of titles) {
      await ff.writeFile(t.file, new TextEncoder().encode(t.text));
      written.push(t.file);
    }
    // -progress pipe:1 is for native FFmpeg; the WASM build reports progress via events.
    const wasmArgs = args.filter((a, k) => !(a === "-progress" || args[k - 1] === "-progress"));
    const code = await ff.exec(wasmArgs);
    if (code !== 0) {
      console.error("[cinemind] ffmpeg failed", code, logs.join(String.fromCharCode(10)));
      throw new Error("Render failed. Try a shorter project or the desktop app.");
    }
    const data = await ff.readFile("out.mp4");
    written.push("out.mp4");
    onProgress(100, "Done");
    return new Blob([data as Uint8Array<ArrayBuffer>], { type: "video/mp4" });
  } finally {
    ff.off("progress", progress);
    ff.off("log", log);
    for (const n of written) await ff.deleteFile(n).catch(() => {});
  }
}
