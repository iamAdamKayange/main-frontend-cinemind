"use client";

import type { Crop } from "@cinemind/timeline-engine";
import { useRef, useState } from "react";

type Edge = "left" | "right" | "top" | "bottom" | "move";
const MAX = 0.45;

/**
 * On-canvas crop: shows the whole source picture with the kept area highlighted.
 * Drag the edges/corners to crop, drag inside to move the crop window.
 */
export function CropOverlay({ srcAspect, boxAspect, initial, onDone, onCancel }: { srcAspect: number; boxAspect: number; initial: Crop; onDone: (c: Crop) => void; onCancel: () => void }) {
  const [c, setC] = useState<Crop>(initial);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ edges: Edge[]; x: number; y: number; start: Crop } | null>(null);

  // Where the uncropped picture sits inside the preview box ("fit").
  const wide = srcAspect >= boxAspect;
  const media = wide ? { w: 100, h: (boxAspect / srcAspect) * 100 } : { w: (srcAspect / boxAspect) * 100, h: 100 };
  const mx = (100 - media.w) / 2;
  const my = (100 - media.h) / 2;

  const down = (edges: Edge[]) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { edges, x: e.clientX, y: e.clientY, start: c };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - d.x) / ((r.width * media.w) / 100);
    const dy = (e.clientY - d.y) / ((r.height * media.h) / 100);
    const s = d.start;
    const n = { ...s };
    const clamp = (v: number) => Math.min(MAX, Math.max(0, v));
    if (d.edges.includes("move")) {
      const mxv = Math.max(-s.left, Math.min(s.right, dx));
      const myv = Math.max(-s.top, Math.min(s.bottom, dy));
      Object.assign(n, { left: s.left + mxv, right: s.right - mxv, top: s.top + myv, bottom: s.bottom - myv });
    }
    if (d.edges.includes("left")) n.left = clamp(Math.min(s.left + dx, 1 - s.right - 0.1));
    if (d.edges.includes("right")) n.right = clamp(Math.min(s.right - dx, 1 - s.left - 0.1));
    if (d.edges.includes("top")) n.top = clamp(Math.min(s.top + dy, 1 - s.bottom - 0.1));
    if (d.edges.includes("bottom")) n.bottom = clamp(Math.min(s.bottom - dy, 1 - s.top - 0.1));
    setC(n);
  };

  const box = { left: mx + c.left * media.w, top: my + c.top * media.h, width: media.w * (1 - c.left - c.right), height: media.h * (1 - c.top - c.bottom) };
  const handle = "absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-accent shadow";
  const r2 = (n: number) => Math.round(n * 100) / 100;

  return (
    <div ref={ref} className="absolute inset-0 z-20 touch-none select-none" onPointerMove={move} onPointerUp={() => (drag.current = null)}>
      {/* Dim everything outside the kept area. */}
      <div className="absolute inset-0 bg-black/55" style={{ clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${box.left}% ${box.top}%,${box.left}% ${box.top + box.height}%,${box.left + box.width}% ${box.top + box.height}%,${box.left + box.width}% ${box.top}%,${box.left}% ${box.top}%)` }} />
      <div className="absolute cursor-move border-2 border-accent" style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }} onPointerDown={down(["move"])}>
        {/* rule of thirds */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="border border-white/15" />
          ))}
        </div>
        <span className={`${handle} -left-2 top-1/2 -translate-y-1/2 cursor-ew-resize`} onPointerDown={down(["left"])} />
        <span className={`${handle} -right-2 top-1/2 -translate-y-1/2 cursor-ew-resize`} onPointerDown={down(["right"])} />
        <span className={`${handle} -top-2 left-1/2 -translate-x-1/2 cursor-ns-resize`} onPointerDown={down(["top"])} />
        <span className={`${handle} -bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize`} onPointerDown={down(["bottom"])} />
        <span className={`${handle} -left-2 -top-2 cursor-nwse-resize`} onPointerDown={down(["left", "top"])} />
        <span className={`${handle} -right-2 -top-2 cursor-nesw-resize`} onPointerDown={down(["right", "top"])} />
        <span className={`${handle} -bottom-2 -left-2 cursor-nesw-resize`} onPointerDown={down(["left", "bottom"])} />
        <span className={`${handle} -bottom-2 -right-2 cursor-nwse-resize`} onPointerDown={down(["right", "bottom"])} />
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => setC({ left: 0, right: 0, top: 0, bottom: 0 })} className="rounded-full bg-black/70 px-3 py-1.5 text-[12px] text-soft backdrop-blur hover:text-text">
          Reset
        </button>
        <button onClick={onCancel} className="rounded-full bg-black/70 px-3 py-1.5 text-[12px] text-soft backdrop-blur hover:text-text">
          Cancel
        </button>
        <button onClick={() => onDone({ left: r2(c.left), right: r2(c.right), top: r2(c.top), bottom: r2(c.bottom) })} className="btn-primary !px-4 !py-1.5 text-[12px]">
          Done
        </button>
      </div>
    </div>
  );
}
