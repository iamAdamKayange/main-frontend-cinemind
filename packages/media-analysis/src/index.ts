/**
 * Audio analysis that runs anywhere (browser, desktop WebView, Node): the caller decodes
 * audio to mono float PCM; this module finds tempo, beats, downbeats, onsets, silences and
 * waveform peaks (spec §9.3). No I/O, no dependencies.
 */

export interface AudioFeatures {
  bpm: number | null;
  beats: number[];
  downbeats: number[];
  onsets: number[];
  /** Normalised 0..1 peaks, `peaksPerSecond` per second, for drawing real waveforms. */
  peaks: number[];
  peaksPerSecond: number;
  loudnessDb: number;
  silences: Array<[number, number]>;
}

/** Recommended analysis sample rate; callers should resample to this. */
export const ANALYSIS_RATE = 11025;

export function analyzePcm(samples: Float32Array, rate: number = ANALYSIS_RATE): AudioFeatures {
  const HOP = Math.max(64, Math.round((256 * rate) / ANALYSIS_RATE));
  const hopsPerSec = rate / HOP;
  const n = Math.floor(samples.length / HOP);
  const energy = new Float32Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < HOP; j++) {
      const v = samples[i * HOP + j];
      s += v * v;
    }
    energy[i] = s / HOP;
    total += energy[i];
  }
  const loudnessDb = 10 * Math.log10(total / Math.max(1, n) + 1e-12);

  // Waveform peaks (20/s).
  const PPS = 20;
  const per = Math.max(1, Math.round(hopsPerSec / PPS));
  const raw: number[] = [];
  let maxPeak = 1e-9;
  for (let i = 0; i < n; i += per) {
    let m = 0;
    for (let j = i; j < Math.min(n, i + per); j++) m = Math.max(m, Math.sqrt(energy[j]));
    raw.push(m);
    maxPeak = Math.max(maxPeak, m);
  }
  const peaks = raw.map((p) => Math.round((p / maxPeak) * 100) / 100);

  // Silences (< -45 dBFS for ≥ 0.5 s).
  const silences: Array<[number, number]> = [];
  let sStart = -1;
  for (let i = 0; i <= n; i++) {
    const quiet = i < n && 10 * Math.log10(energy[i] + 1e-12) < -45;
    if (quiet && sStart < 0) sStart = i;
    if (!quiet && sStart >= 0) {
      if ((i - sStart) / hopsPerSec >= 0.5) silences.push([+(sStart / hopsPerSec).toFixed(2), +(i / hopsPerSec).toFixed(2)]);
      sStart = -1;
    }
  }

  // Onset envelope: half-wave rectified log-energy flux.
  const env = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    const d = Math.log(energy[i] + 1e-9) - Math.log(energy[i - 1] + 1e-9);
    env[i] = d > 0 ? d : 0;
  }
  const W = 8;
  const onsets: number[] = [];
  for (let i = W; i < n - W; i++) {
    let mean = 0;
    for (let j = i - W; j <= i + W; j++) mean += env[j];
    mean /= 2 * W + 1;
    let isMax = true;
    for (let j = i - 3; j <= i + 3; j++) if (env[j] > env[i]) isMax = false;
    if (isMax && env[i] > mean * 1.6 + 0.15) {
      const t = i / hopsPerSec;
      if (!onsets.length || t - onsets[onsets.length - 1] > 0.09) onsets.push(+t.toFixed(3));
    }
  }

  const empty = { bpm: null, beats: [], downbeats: [], onsets, peaks, peaksPerSecond: PPS, loudnessDb: +loudnessDb.toFixed(1), silences };

  // Tempo: autocorrelation over 70–180 BPM with a mild prior around 120.
  let bestLag = 0;
  let bestScore = -Infinity;
  const minLag = Math.floor((60 / 180) * hopsPerSec);
  const maxLag = Math.ceil((60 / 70) * hopsPerSec);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = lag; i < n; i++) s += env[i] * env[i - lag];
    const bpm = (60 * hopsPerSec) / lag;
    s *= Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.9, 2));
    if (s > bestScore) {
      bestScore = s;
      bestLag = lag;
    }
  }
  if (!bestLag || n < hopsPerSec * 4 || onsets.length < 8) return empty;

  let bestPhase = 0;
  let bestPhaseScore = -Infinity;
  for (let ph = 0; ph < bestLag; ph++) {
    let s = 0;
    for (let i = ph; i < n; i += bestLag) s += env[i];
    if (s > bestPhaseScore) {
      bestPhaseScore = s;
      bestPhase = ph;
    }
  }

  // Least-squares refinement of period and phase against onsets (removes hop quantisation).
  let P = bestLag / hopsPerSec;
  let anchor = bestPhase / hopsPerSec;
  for (let iter = 0; iter < 3; iter++) {
    const pairs: Array<[number, number]> = [];
    for (const o of onsets) {
      const k = Math.round((o - anchor) / P);
      if (Math.abs(o - (anchor + k * P)) < 0.07) pairs.push([k, o]);
    }
    if (pairs.length < 6) break;
    const mk = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
    const mo = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
    let num = 0;
    let den = 0;
    for (const [k, o] of pairs) {
      num += (k - mk) * (o - mo);
      den += (k - mk) * (k - mk);
    }
    if (den <= 0) break;
    P = num / den;
    anchor = mo - P * mk;
  }
  const durSec = n / hopsPerSec;
  const beats: number[] = [];
  for (let k = Math.ceil(-anchor / P); anchor + k * P < durSec; k++) beats.push(+(anchor + k * P).toFixed(3));

  const bar = [0, 0, 0, 0];
  beats.forEach((b, i) => (bar[i % 4] += env[Math.min(n - 1, Math.round(b * hopsPerSec))]));
  const db = bar.indexOf(Math.max(...bar));
  const downbeats = beats.filter((_, i) => i % 4 === db);
  return { ...empty, bpm: Math.round((60 / P) * 10) / 10, beats, downbeats };
}

/** Linear-interpolation resample to the analysis rate (good enough for envelope analysis). */
export function resample(input: Float32Array, fromRate: number, toRate: number = ANALYSIS_RATE): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const f = x - i0;
    out[i] = (input[i0] ?? 0) * (1 - f) + (input[i0 + 1] ?? 0) * f;
  }
  return out;
}

export interface SceneCut {
  time: number;
  score: number;
}

/**
 * Shot-change detection from a sequence of small greyscale frames (e.g. 32×18 luma),
 * sampled at fixed intervals. Returns times where the frame difference spikes.
 */
export function detectCuts(frames: Uint8Array[], intervalSec: number, threshold = 0.28): SceneCut[] {
  const cuts: SceneCut[] = [];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    let d = 0;
    for (let j = 0; j < a.length; j++) d += Math.abs(a[j] - b[j]);
    const score = d / (a.length * 255);
    if (score > threshold) cuts.push({ time: +(i * intervalSec).toFixed(3), score: +score.toFixed(3) });
  }
  return cuts;
}
