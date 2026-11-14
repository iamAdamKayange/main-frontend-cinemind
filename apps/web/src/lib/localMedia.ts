"use client";

import { ANALYSIS_RATE, analyzePcm, detectCuts, resample, type AudioFeatures, type SceneCut } from "@cinemind/media-analysis";

/**
 * Local-first media (CineMind policy: original media never leaves the user's device).
 *
 * Files are kept in the browser's Origin Private File System (OPFS) — on the desktop app this
 * is the WebView's private storage — keyed by project and asset id. Only metadata, a content
 * fingerprint and small analysis results are sent to the server.
 */

async function mediaDir(projectId: string, create = true): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  const media = await root.getDirectoryHandle("cinemind-media", { create });
  return media.getDirectoryHandle(projectId, { create });
}

export function localStorageSupported() {
  return typeof navigator !== "undefined" && !!navigator.storage?.getDirectory;
}

/** Ask the browser not to evict our media under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}

export async function storageEstimate() {
  try {
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch {
    return null;
  }
}

export async function saveLocal(projectId: string, name: string, data: Blob) {
  const dir = await mediaDir(projectId);
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(data);
  await w.close();
}

export async function loadLocal(projectId: string, name: string): Promise<File | null> {
  try {
    const dir = await mediaDir(projectId, false);
    const fh = await dir.getFileHandle(name);
    return await fh.getFile();
  } catch {
    return null;
  }
}

export async function removeLocal(projectId: string, name: string) {
  try {
    const dir = await mediaDir(projectId, false);
    await dir.removeEntry(name);
  } catch {
    /* already gone */
  }
}

/**
 * Fast content fingerprint: SHA-256 of size + first and last 2 MB. Identifies the same file
 * on another device for relinking without hashing gigabytes.
 */
export async function fingerprint(file: Blob): Promise<string> {
  const CH = 2 * 1024 * 1024;
  const head = await file.slice(0, CH).arrayBuffer();
  const tail = await file.slice(Math.max(0, file.size - CH)).arrayBuffer();
  const sizeBuf = new TextEncoder().encode(String(file.size));
  const all = new Uint8Array(sizeBuf.length + head.byteLength + tail.byteLength);
  all.set(sizeBuf, 0);
  all.set(new Uint8Array(head), sizeBuf.length);
  all.set(new Uint8Array(tail), sizeBuf.length + head.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", all);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface LocalProbe {
  kind: "video" | "audio" | "image";
  durationSec: number;
  width: number | null;
  height: number | null;
}

export function kindOf(file: File): LocalProbe["kind"] | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  return null;
}

export function probeLocal(file: File): Promise<LocalProbe> {
  const kind = kindOf(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const done = (p: LocalProbe) => {
      URL.revokeObjectURL(url);
      resolve(p);
    };
    if (kind === "image") {
      const img = new Image();
      img.onload = () => done({ kind, durationSec: 5, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("This image can't be read."));
      img.src = url;
      return;
    }
    if (!kind) return reject(new Error("Unsupported file type."));
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const v = el as HTMLVideoElement;
      done({ kind, durationSec: isFinite(el.duration) ? el.duration : 0, width: kind === "video" ? v.videoWidth : null, height: kind === "video" ? v.videoHeight : null });
    };
    el.onerror = () => reject(new Error("This browser can't decode this file. Try MP4 (H.264) or use the desktop app."));
    el.src = url;
  });
}

/** Decode the audio track and run beat/silence/waveform analysis on-device. */
export async function analyzeAudioLocal(file: Blob): Promise<AudioFeatures | null> {
  try {
    const buf = await file.arrayBuffer();
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const audio = await ctx.decodeAudioData(buf);
    const mono = new Float32Array(audio.length);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const d = audio.getChannelData(c);
      for (let i = 0; i < d.length; i++) mono[i] += d[i] / audio.numberOfChannels;
    }
    return analyzePcm(resample(mono, audio.sampleRate, ANALYSIS_RATE), ANALYSIS_RATE);
  } catch {
    return null; // no audio track, or codec not decodable here
  }
}

/** Seek a video element and wait for the frame. */
function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>((res) => {
    const on = () => {
      v.removeEventListener("seeked", on);
      res();
    };
    v.addEventListener("seeked", on);
    v.currentTime = t;
  });
}

/**
 * Thumbnail + shot-change detection from the video itself (sampled at 2 fps on a tiny canvas).
 * Long files are capped to keep import fast.
 */
export async function analyzeVideoLocal(file: Blob, durationSec: number): Promise<{ thumb: Blob | null; scenes: SceneCut[] }> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "auto";
  v.src = url;
  try {
    await new Promise<void>((res, rej) => {
      v.onloadeddata = () => res();
      v.onerror = () => rej(new Error("decode"));
    });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    // Thumbnail (480 px wide) at ~1 s.
    await seek(v, Math.min(1, durationSec / 3));
    canvas.width = 480;
    canvas.height = Math.round((480 * v.videoHeight) / Math.max(1, v.videoWidth)) || 270;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const thumb = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));

    // Scene detection on 32×18 luma frames.
    const interval = 0.5;
    const maxSamples = 600; // 5 minutes at 2 fps
    canvas.width = 32;
    canvas.height = 18;
    const frames: Uint8Array[] = [];
    for (let t = 0, k = 0; t < durationSec && k < maxSamples; t += interval, k++) {
      await seek(v, t);
      ctx.drawImage(v, 0, 0, 32, 18);
      const px = ctx.getImageData(0, 0, 32, 18).data;
      const luma = new Uint8Array(32 * 18);
      for (let i = 0; i < luma.length; i++) luma[i] = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) | 0;
      frames.push(luma);
    }
    return { thumb, scenes: detectCuts(frames, interval) };
  } catch {
    return { thumb: null, scenes: [] };
  } finally {
    URL.revokeObjectURL(url);
    v.removeAttribute("src");
  }
}
