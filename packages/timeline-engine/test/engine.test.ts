import { test } from "node:test";
import assert from "node:assert/strict";
import { applyBatch, createHistory, commit, undo, redo, current, type TimelineDocument, type AssetInfo } from "../src/index.ts";

const assets: AssetInfo[] = [
  { id: "a_v1", kind: "video", name: "Clip 1", durationFrames: 900 },
  { id: "a_v2", kind: "video", name: "Clip 2", durationFrames: 600 },
  { id: "a_song", kind: "audio", name: "song.wav", durationFrames: 5400 },
];

const base = (): TimelineDocument => ({
  schemaVersion: 1, projectId: "p", version: 1,
  sequence: { width: 1920, height: 1080, fps: { num: 30, den: 1 }, audioSampleRate: 48000 },
  tracks: [
    { id: "v1", kind: "video", order: 1, name: "V1", clips: [
      { id: "c1", assetId: "a_v1", timelineStartFrames: 0, sourceInFrames: 0, sourceOutFrames: 900 } ] },
    { id: "a1", kind: "audio", order: 1, name: "A1", clips: [] },
    { id: "t1", kind: "text", order: 1, name: "T1", clips: [] },
  ],
  transitions: [],
});
let n = 0; const id = (p: string) => `${p}_${n++}`;

test("demo flow: trim, insert after, add song, fade out", () => {
  const r = applyBatch(base(), { expectedVersion: 1, operations: [
    { type: "clip.trim", clipId: "c1", sourceInFrames: 0, sourceOutFrames: 360 },
    { type: "clip.insert", assetId: "a_v2", trackId: "v1", timelineStartFrames: 360 },
    { type: "clip.insert", assetId: "a_song", trackId: "a1", timelineStartFrames: 0, sourceOutFrames: 960 },
  ] }, assets, id);
  assert.ok(r.ok);
  assert.equal(r.document.version, 2);
  assert.equal(r.document.tracks[0].clips.length, 2);
  assert.equal(r.document.tracks[1].clips[0].sourceOutFrames, 960);
});

test("batch is atomic: one bad op rejects all", () => {
  const doc = base();
  const r = applyBatch(doc, { expectedVersion: 1, operations: [
    { type: "clip.trim", clipId: "c1", sourceInFrames: 0, sourceOutFrames: 300 },
    { type: "clip.insert", assetId: "a_song", trackId: "v1", timelineStartFrames: 400 },
  ] }, assets, id);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.errors[0].code, "TRACK_KIND");
  assert.equal(doc.tracks[0].clips[0].sourceOutFrames, 900, "input not mutated");
});

test("stale version is rejected", () => {
  const r = applyBatch(base(), { expectedVersion: 0, operations: [] }, assets, id);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.errors[0].code, "STALE_VERSION");
});

test("out-of-media trim and overlap are rejected", () => {
  const a = applyBatch(base(), { expectedVersion: 1, operations: [{ type: "clip.trim", clipId: "c1", sourceInFrames: 0, sourceOutFrames: 901 }] }, assets, id);
  assert.equal(a.ok, false);
  const b = applyBatch(base(), { expectedVersion: 1, operations: [{ type: "clip.insert", assetId: "a_v2", trackId: "v1", timelineStartFrames: 100 }] }, assets, id);
  assert.equal(b.ok, false);
});

test("split keeps total duration and source continuity", () => {
  const r = applyBatch(base(), { expectedVersion: 1, operations: [{ type: "clip.split", clipId: "c1", atTimelineFrame: 300 }] }, assets, id);
  assert.ok(r.ok);
  const [l, rt] = r.document.tracks[0].clips;
  assert.equal(l.sourceOutFrames, 300);
  assert.equal(rt.sourceInFrames, 300);
  assert.equal(rt.timelineStartFrames, 300);
  assert.equal(rt.sourceOutFrames, 900);
});

test("transition requires adjacency; title goes on text track", () => {
  const s = applyBatch(base(), { expectedVersion: 1, operations: [{ type: "clip.split", clipId: "c1", atTimelineFrame: 300 }] }, assets, id);
  assert.ok(s.ok);
  const [l, rt] = s.document.tracks[0].clips;
  const t = applyBatch(s.document, { expectedVersion: 2, operations: [
    { type: "transition.add", fromClipId: l.id, toClipId: rt.id, kind: "dissolve", durationFrames: 15 },
    { type: "title.add", trackId: "t1", text: "Hello", startFrame: 0, durationFrames: 90 },
  ] }, assets, id);
  assert.ok(t.ok);
  assert.equal(t.document.transitions.length, 1);
  assert.equal(t.document.tracks[2].clips[0].text, "Hello");
});

test("history undo/redo keeps versions immutable", () => {
  let h = createHistory(base());
  const r = applyBatch(current(h), { expectedVersion: 1, operations: [{ type: "clip.delete", clipId: "c1" }] }, assets, id);
  assert.ok(r.ok);
  h = commit(h, r.document);
  assert.equal(current(h).tracks[0].clips.length, 0);
  h = undo(h);
  assert.equal(current(h).tracks[0].clips.length, 1);
  h = redo(h);
  assert.equal(current(h).version, 2);
});

test("track lock blocks edits; transform validates opacity", () => {
  const r = applyBatch(base(), { expectedVersion: 1, operations: [
    { type: "track.update", trackId: "v1", locked: true },
    { type: "clip.trim", clipId: "c1", sourceInFrames: 0, sourceOutFrames: 300 },
  ] }, assets, id);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.errors[0].code, "TRACK_LOCKED");
  const t = applyBatch(base(), { expectedVersion: 1, operations: [{ type: "clip.setTransform", clipId: "c1", transform: { opacity: 1.5 } }] }, assets, id);
  assert.equal(t.ok, false);
  const ok = applyBatch(base(), { expectedVersion: 1, operations: [{ type: "clip.setTransform", clipId: "c1", transform: { opacity: 0.5 } }] }, assets, id);
  assert.ok(ok.ok);
  assert.equal(ok.document.tracks[0].clips[0].transform?.opacity, 0.5);
});

test("frame change and crop validate", () => {
  const r = applyBatch(base(), { expectedVersion: 1, operations: [
    { type: "sequence.update", width: 1080, height: 1920 },
    { type: "clip.setTransform", clipId: "c1", transform: { fit: "fill", crop: { left: 0.1, top: 0, right: 0.1, bottom: 0.05 } } },
  ] }, assets, id);
  assert.ok(r.ok);
  assert.equal(r.document.sequence.height, 1920);
  assert.equal(r.document.tracks[0].clips[0].transform?.fit, "fill");
  const bad = applyBatch(base(), { expectedVersion: 1, operations: [{ type: "clip.setTransform", clipId: "c1", transform: { crop: { left: 0.6, top: 0, right: 0, bottom: 0 } } }] }, assets, id);
  assert.equal(bad.ok, false);
});

test("effects merge and validate", () => {
  const r = applyBatch(base(), { expectedVersion: 1, operations: [
    { type: "clip.setEffects", clipId: "c1", fx: { look: "vintage", contrast: 1.2 } },
    { type: "clip.setEffects", clipId: "c1", fx: { denoise: true, bass: 4 } },
  ] }, assets, id);
  assert.ok(r.ok);
  assert.deepEqual(r.document.tracks[0].clips[0].fx, { look: "vintage", contrast: 1.2, denoise: true, bass: 4 });
  const bad = applyBatch(base(), { expectedVersion: 1, operations: [{ type: "clip.setEffects", clipId: "c1", fx: { bass: 40 } }] }, assets, id);
  assert.equal(bad.ok, false);
});
