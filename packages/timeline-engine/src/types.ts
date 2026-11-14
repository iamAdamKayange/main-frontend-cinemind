/**
 * Canonical CineMind timeline document (spec §5).
 * Time is stored as integer frames in the sequence timebase — never float seconds.
 */

export interface Rational {
  num: number;
  den: number;
}

export type TrackKind = "video" | "audio" | "text";
export type AssetKind = "video" | "audio" | "image";

export interface Crop {
  /** Fractions of the source frame removed from each edge (0..0.45). */
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Transform {
  /** Offset from centre, in sequence pixels. */
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  /** "fit" letterboxes the whole picture; "fill" covers the frame and crops the overflow. */
  fit?: "fit" | "fill";
  crop?: Crop;
}

export type TransformKeyframeValues = Pick<Transform, "x" | "y" | "scaleX" | "scaleY" | "opacity">;
export interface TransformKeyframe {
  /** Frame offset from the visible start of the clip. */
  frame: number;
  values: Partial<TransformKeyframeValues>;
}

/** Per-clip effects. Visual ones apply to video/image/title clips, audio ones to anything with sound. */
export interface ClipEffects {
  look?: "none" | "bw" | "vintage" | "warm" | "cool" | "cinematic";
  /** -1..1 */
  brightness?: number;
  /** 0..2 (1 = unchanged) */
  contrast?: number;
  /** 0..3 (1 = unchanged) */
  saturation?: number;
  /** 0..20 px */
  blur?: number;
  /** 0..5 edge sharpening strength. */
  sharpen?: number;
  /** 0..1 edge darkening strength. */
  vignette?: number;
  /** Even out loudness to a broadcast-style level. */
  normalize?: boolean;
  /** Reduce steady background noise (hiss, hum, fans). */
  denoise?: boolean;
  /** Low-shelf gain in dB, -12..12 */
  bass?: number;
  /** Mid-band gain in dB, -12..12. */
  mid?: number;
  /** High-shelf gain in dB, -12..12 */
  treble?: number;
  /** Stereo balance: -1 is left, 0 center, 1 right. */
  stereoPan?: number;
  /** Cut rumble and lift speech presence. */
  voice?: boolean;
  /** Short room echo. */
  echo?: boolean;
  /** Reduce loud peaks while keeping quieter speech audible. */
  compressor?: boolean;
  /** Semitone pitch shift applied without changing clip duration (-12..12). */
  pitchSemitones?: number;
  /** Export-time voice tone/color preset. */
  voicePreset?: "natural" | "deep" | "bright" | "telephone" | "radio" | "robot";
}

export interface Clip {
  id: string;
  /** Media asset reference; null for generated clips such as titles. */
  assetId: string | null;
  timelineStartFrames: number;
  sourceInFrames: number;
  sourceOutFrames: number;
  transform?: Transform;
  transformKeyframes?: TransformKeyframe[];
  fx?: ClipEffects;
  gainDb?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  /** Text payload for title clips. */
  text?: string;
  label?: string;
}

export interface Track {
  id: string;
  kind: TrackKind;
  order: number;
  name: string;
  muted?: boolean;
  locked?: boolean;
  hidden?: boolean;
  clips: Clip[];
}

export interface Transition {
  id: string;
  fromClipId: string;
  toClipId: string;
  kind: "dissolve" | "fade" | "dip-to-black";
  durationFrames: number;
}

export interface Sequence {
  width: number;
  height: number;
  fps: Rational;
  audioSampleRate: number;
}

export interface TimelineDocument {
  schemaVersion: 1;
  projectId: string;
  /** Monotonic version number; every applied batch produces a new one. */
  version: number;
  sequence: Sequence;
  tracks: Track[];
  transitions: Transition[];
}

/** Minimal asset metadata the engine needs to validate edits. */
export interface AssetInfo {
  id: string;
  kind: AssetKind;
  name: string;
  durationFrames: number;
}

export type EditOperation =
  | { type: "clip.trim"; clipId: string; sourceInFrames: number; sourceOutFrames: number }
  | { type: "clip.move"; clipId: string; trackId: string; timelineStartFrames: number }
  | { type: "clip.split"; clipId: string; atTimelineFrame: number }
  | { type: "clip.insert"; assetId: string; trackId: string; timelineStartFrames: number; sourceInFrames?: number; sourceOutFrames?: number }
  | { type: "clip.delete"; clipId: string }
  | { type: "audio.setGain"; clipId: string; gainDb: number }
  | { type: "audio.setFades"; clipId: string; fadeInFrames: number; fadeOutFrames: number }
  | { type: "transition.add"; fromClipId: string; toClipId: string; kind: Transition["kind"]; durationFrames: number }
  | { type: "title.add"; trackId: string; text: string; startFrame: number; durationFrames: number }
  | { type: "clip.setTransform"; clipId: string; transform: Partial<Transform> }
  | { type: "clip.setTransformKeyframe"; clipId: string; keyframe: TransformKeyframe }
  | { type: "clip.removeTransformKeyframe"; clipId: string; frame: number }
  | { type: "track.update"; trackId: string; muted?: boolean; locked?: boolean; hidden?: boolean }
  | { type: "title.update"; clipId: string; text: string }
  | { type: "sequence.update"; width: number; height: number }
  | { type: "clip.setEffects"; clipId: string; fx: Partial<ClipEffects> }
  | { type: "transition.remove"; transitionId: string };

export interface OperationBatch {
  /** Optimistic-concurrency guard (spec §5.5). */
  expectedVersion: number;
  operations: EditOperation[];
}

export interface ValidationError {
  index: number;
  operation: EditOperation["type"];
  code: string;
  message: string;
}

export type ApplyResult =
  | { ok: true; document: TimelineDocument }
  | { ok: false; errors: ValidationError[] };
