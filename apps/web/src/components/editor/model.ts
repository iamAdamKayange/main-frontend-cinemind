import type { AssetInfo, TimelineDocument } from "@cinemind/timeline-engine";
import type { Photo } from "@/lib/photos";
import { PHOTOS } from "@/lib/photos";
import type { RemoteAsset } from "@/lib/api";

export const FPS = 30;

/** Editor-side asset: engine metadata plus how to show it. */
export interface EditorAsset extends AssetInfo {
  /** Playable URL (proxy when available). */
  url?: string;
  thumbUrl?: string | null;
  /** Illustrative still for demo media. */
  photo?: Photo;
  sizeLabel?: string;
  status?: RemoteAsset["status"] | "uploading" | "offline";
  location?: "device" | "cloud";
  fingerprint?: string | null;
  hasAudio?: boolean;
  progress?: number;
  bpm?: number | null;
  beats?: number[];
  peaks?: number[];
  peaksPerSecond?: number;
  width?: number | null;
  height?: number | null;
  local?: boolean;
}

export const SAMPLE_ASSETS: EditorAsset[] = [
  { id: "a_stage3", kind: "video", name: "Stage take 3", durationFrames: 18 * FPS, photo: PHOTOS.tzStage, sizeLabel: "1080p · 412 MB" },
  { id: "a_street1", kind: "video", name: "Kariakoo street take", durationFrames: 24 * FPS, photo: PHOTOS.streetVendor, sizeLabel: "1080p · 538 MB" },
  { id: "a_dhow", kind: "video", name: "Dhow at sunset", durationFrames: 15 * FPS, photo: PHOTOS.dhowSunset, sizeLabel: "4K · 1.2 GB" },
  { id: "a_kili", kind: "video", name: "Kilimanjaro aerial", durationFrames: 20 * FPS, photo: PHOTOS.kilimanjaro, sizeLabel: "4K · 980 MB" },
  { id: "a_dar", kind: "video", name: "Dar dusk wide", durationFrames: 22 * FPS, photo: PHOTOS.darDusk, sizeLabel: "1080p · 466 MB" },
  { id: "a_guitar", kind: "video", name: "Guitar close-up", durationFrames: 30 * FPS, photo: PHOTOS.tzGuitarist, sizeLabel: "1080p · 690 MB" },
  { id: "a_song", kind: "audio", name: "bongo-nights.wav", durationFrames: 96 * FPS, sizeLabel: "48 kHz · 32 MB", bpm: 120 },
  { id: "a_vox", kind: "audio", name: "crowd-ambience.wav", durationFrames: 40 * FPS, sizeLabel: "48 kHz · 14 MB" },
];

export function fromRemote(a: RemoteAsset): EditorAsset {
  return {
    id: a.id,
    kind: a.kind,
    name: a.name,
    durationFrames: a.durationFrames ?? 0,
    // Remote URLs are intentionally never used for media playback or export. Relink from this device.
    url: undefined,
    location: a.location,
    fingerprint: a.fingerprint,
    hasAudio: a.hasAudio,
    width: a.width,
    height: a.height,
    thumbUrl: a.thumbUrl,
    status: a.status,
    sizeLabel: `${a.width && a.height ? `${a.width}×${a.height} · ` : ""}${(a.sizeBytes / 1e6).toFixed(1)} MB`,
    bpm: a.analysis?.bpm ?? null,
    beats: a.analysis?.beats,
    peaks: a.analysis?.peaks,
    peaksPerSecond: a.analysis?.peaksPerSecond,
  };
}

export function sampleTimeline(projectId: string, aspect: string = "16:9"): TimelineDocument {
  const [width, height] = aspect === "9:16" ? [1080, 1920] : aspect === "1:1" ? [1080, 1080] : [1920, 1080];
  const tf = { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
  return {
    schemaVersion: 1,
    projectId,
    version: 1,
    sequence: { width, height, fps: { num: FPS, den: 1 }, audioSampleRate: 48000 },
    tracks: [
      { id: "v2", kind: "video", order: 2, name: "V2", clips: [] },
      {
        id: "v1",
        kind: "video",
        order: 1,
        name: "V1",
        clips: [
          { id: "clip_street", assetId: "a_street1", label: "Kariakoo street take", timelineStartFrames: 0, sourceInFrames: 2 * FPS, sourceOutFrames: 20 * FPS, transform: tf },
          { id: "clip_stage", assetId: "a_stage3", label: "Stage take 3", timelineStartFrames: 18 * FPS, sourceInFrames: 0, sourceOutFrames: 14 * FPS, transform: tf },
          { id: "clip_dhow", assetId: "a_dhow", label: "Dhow at sunset", timelineStartFrames: 32 * FPS, sourceInFrames: FPS, sourceOutFrames: 11 * FPS, transform: tf },
        ],
      },
      {
        id: "t1",
        kind: "text",
        order: 1,
        name: "T1",
        clips: [{ id: "title_intro", assetId: null, text: "BONGO NIGHTS", label: "BONGO NIGHTS", timelineStartFrames: FPS, sourceInFrames: 0, sourceOutFrames: 4 * FPS, transform: tf }],
      },
      {
        id: "a1",
        kind: "audio",
        order: 1,
        name: "A1",
        clips: [{ id: "clip_song", assetId: "a_song", label: "bongo-nights.wav", timelineStartFrames: 0, sourceInFrames: 0, sourceOutFrames: 42 * FPS, gainDb: -2, fadeInFrames: 15, fadeOutFrames: 0 }],
      },
      { id: "a2", kind: "audio", order: 2, name: "A2", clips: [] },
    ],
    transitions: [],
  };
}

export function emptyTimeline(projectId: string, aspect: string = "16:9"): TimelineDocument {
  const [width, height] = aspect === "9:16" ? [1080, 1920] : aspect === "1:1" ? [1080, 1080] : [1920, 1080];
  return {
    schemaVersion: 1,
    projectId,
    version: 1,
    sequence: { width, height, fps: { num: FPS, den: 1 }, audioSampleRate: 48000 },
    tracks: [
      { id: "v2", kind: "video", order: 2, name: "V2", clips: [] },
      { id: "v1", kind: "video", order: 1, name: "V1", clips: [] },
      { id: "a1", kind: "audio", order: 1, name: "A1", clips: [] },
      { id: "a2", kind: "audio", order: 2, name: "A2", clips: [] },
      { id: "t1", kind: "text", order: 1, name: "T1", clips: [] },
    ],
    transitions: [],
  };
}

/** Deterministic pseudo-waveform for media without analysis yet. */
export function waveform(seed: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const r = ((h >>> 0) % 1000) / 1000;
    const env = 0.55 + 0.45 * Math.sin(i * 0.11) * Math.sin(i * 0.037 + 1);
    // Rounded so server and browser render identical SVG.
    out.push(Math.round(Math.max(0.08, Math.min(1, r * 0.5 + env * 0.6)) * 100) / 100);
  }
  return out;
}

/** Real waveform slice for a clip, resampled to `n` bars. */
export function clipPeaks(asset: EditorAsset | undefined, inFrames: number, outFrames: number, n: number): number[] | null {
  if (!asset?.peaks?.length || !asset.peaksPerSecond) return null;
  const pps = asset.peaksPerSecond;
  const a = (inFrames / FPS) * pps;
  const b = (outFrames / FPS) * pps;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = Math.floor(a + ((b - a) * i) / n);
    const e = Math.max(s + 1, Math.floor(a + ((b - a) * (i + 1)) / n));
    let m = 0;
    for (let j = s; j < e && j < asset.peaks.length; j++) m = Math.max(m, asset.peaks[j]);
    out.push(Math.max(0.04, m));
  }
  return out;
}

export const secondsToFrames = (s: number) => Math.round(s * FPS);
