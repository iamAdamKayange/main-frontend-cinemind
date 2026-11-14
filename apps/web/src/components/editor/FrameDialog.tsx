"use client";

import { useState } from "react";
import { Check, X } from "@/components/ui/icons";
import { useEditor } from "./EditorContext";

export interface FramePreset {
  id: string;
  name: string;
  use: string;
  w: number;
  h: number;
  ratio: string;
  color: string;
}

/** Frame styles people actually publish to. Several share a ratio; the name is what matters to creators. */
export const FRAME_PRESETS: FramePreset[] = [
  { id: "youtube", name: "YouTube", use: "Videos, music videos", w: 1920, h: 1080, ratio: "16:9", color: "#ff3b30" },
  { id: "shorts", name: "YouTube Shorts", use: "Short vertical videos", w: 1080, h: 1920, ratio: "9:16", color: "#ff3b30" },
  { id: "tiktok", name: "TikTok", use: "For You feed", w: 1080, h: 1920, ratio: "9:16", color: "#25f4ee" },
  { id: "reels", name: "Instagram Reels", use: "Reels and Stories", w: 1080, h: 1920, ratio: "9:16", color: "#e1306c" },
  { id: "ig-post", name: "Instagram Post", use: "Feed, portrait", w: 1080, h: 1350, ratio: "4:5", color: "#e1306c" },
  { id: "square", name: "Square", use: "Instagram & Facebook feed", w: 1080, h: 1080, ratio: "1:1", color: "#8f7fd6" },
  { id: "facebook", name: "Facebook", use: "Feed video", w: 1080, h: 1350, ratio: "4:5", color: "#1877f2" },
  { id: "status", name: "WhatsApp Status", use: "Status updates", w: 1080, h: 1920, ratio: "9:16", color: "#25d366" },
  { id: "x", name: "X (Twitter)", use: "Timeline video", w: 1920, h: 1080, ratio: "16:9", color: "#e7e9ea" },
  { id: "cinema", name: "Cinema", use: "Widescreen film look", w: 1920, h: 804, ratio: "2.39:1", color: "#fcd116" },
  { id: "classic", name: "Classic TV", use: "4:3 retro look", w: 1440, h: 1080, ratio: "4:3", color: "#87a5a6" },
];

const STORE = "cm-frame-preset";

export function framePresetFor(projectKey: string, w: number, h: number): FramePreset | null {
  try {
    const id = localStorage.getItem(`${STORE}:${projectKey}`);
    const p = FRAME_PRESETS.find((x) => x.id === id && x.w === w && x.h === h);
    if (p) return p;
  } catch {
    /* storage unavailable */
  }
  return FRAME_PRESETS.find((x) => x.w === w && x.h === h) ?? null;
}

export function FrameDialog({ onClose }: { onClose: () => void }) {
  const { doc, run, projectId } = useEditor();
  const key = projectId ?? "demo";
  const current = framePresetFor(key, doc.sequence.width, doc.sequence.height);
  const [fill, setFill] = useState(true);

  const choose = (p: FramePreset) => {
    const ops: Parameters<typeof run>[0] = [];
    if (p.w !== doc.sequence.width || p.h !== doc.sequence.height) ops.push({ type: "sequence.update", width: p.w, height: p.h });
    if (fill) {
      // Make every shot cover the new frame (no black bars); keeps any crop/position the user set.
      for (const t of doc.tracks) {
        if (t.kind !== "video" || t.locked) continue;
        for (const c of t.clips) if (c.transform?.fit !== "fill") ops.push({ type: "clip.setTransform", clipId: c.id, transform: { fit: "fill" } });
      }
    }
    try {
      localStorage.setItem(`${STORE}:${key}`, p.id);
    } catch {
      /* ignore */
    }
    if (ops.length) run(ops, `Frame: ${p.name} (${p.ratio})`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="fade-up w-full max-w-[720px] overflow-hidden rounded-[16px] border border-line-strong bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="tz-stripe h-1" />
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-[18px] font-semibold">Frame</h2>
            <p className="text-[12px] text-muted">Pick where the video will be posted. The preview reframes instantly — you can change it any time.</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-white/5">
            <X size={16} />
          </button>
        </div>
        <div className="thin-scroll grid max-h-[60vh] grid-cols-2 gap-2.5 overflow-y-auto p-5 sm:grid-cols-3 md:grid-cols-4">
          {FRAME_PRESETS.map((p) => {
            const active = current?.id === p.id;
            const box = 64;
            const scale = box / Math.max(p.w, p.h);
            return (
              <button
                key={p.id}
                onClick={() => choose(p)}
                className={`group relative flex flex-col items-center gap-2 rounded-[12px] border p-3 text-center transition ${active ? "border-accent bg-accent/[0.08]" : "border-line hover:border-line-strong hover:bg-white/[0.03]"}`}
              >
                {active && (
                  <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-ink">
                    <Check size={12} />
                  </span>
                )}
                <span className="grid h-[72px] w-full place-items-center">
                  <span className="rounded-[4px] border-2 bg-white/[0.04] transition group-hover:scale-105" style={{ width: p.w * scale, height: p.h * scale, borderColor: p.color }} />
                </span>
                <span className="text-[13px] font-semibold leading-tight">{p.name}</span>
                <span className="text-[11px] text-muted">
                  {p.ratio} · {p.use}
                </span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-3 border-t border-line px-5 py-4 text-[13px]">
          <input type="checkbox" checked={fill} onChange={(e) => setFill(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          <span>
            Fill the frame with every shot <span className="text-muted">(no black bars — adjust per clip in Inspector › Frame &amp; crop)</span>
          </span>
        </label>
      </div>
    </div>
  );
}
