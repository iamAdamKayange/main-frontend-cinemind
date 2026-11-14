import type { TimelineDocument } from "./types.ts";

/**
 * Immutable version history (spec §5.1, §8.7): undo never erases a version,
 * it moves the head back; applying a new batch after undo drops the redo branch.
 */
export interface History {
  versions: TimelineDocument[];
  head: number;
}

export function createHistory(initial: TimelineDocument): History {
  return { versions: [initial], head: 0 };
}

export function current(h: History): TimelineDocument {
  return h.versions[h.head];
}

export function commit(h: History, doc: TimelineDocument): History {
  return { versions: [...h.versions.slice(0, h.head + 1), doc], head: h.head + 1 };
}

export function canUndo(h: History) {
  return h.head > 0;
}
export function canRedo(h: History) {
  return h.head < h.versions.length - 1;
}

export function undo(h: History): History {
  return canUndo(h) ? { ...h, head: h.head - 1 } : h;
}
export function redo(h: History): History {
  return canRedo(h) ? { ...h, head: h.head + 1 } : h;
}
