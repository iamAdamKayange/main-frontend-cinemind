"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "@/components/ui/icons";

/**
 * Record a voice-over with the device microphone. The recording becomes a normal media file
 * on this device (it is never uploaded) and is analysed like any other audio.
 */
export function VoiceRecorder({ onDone, onClose }: { onDone: (file: File) => void; onClose: () => void }) {
  const [state, setState] = useState<"idle" | "recording" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const [take, setTake] = useState<{ url: string; file: File } | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);

  const stopAll = () => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stopAll, []);

  const start = async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        const type = r.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : "webm";
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        const file = new File(chunks, `voice-over-${stamp}.${ext}`, { type: type.split(";")[0] });
        setTake({ url: URL.createObjectURL(file), file });
        setState("done");
        stopAll();
      };
      r.start(250);
      rec.current = r;
      setSecs(0);
      setState("recording");

      // Live input meter + timer.
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const t0 = performance.now();
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
        setLevel(peak);
        setSecs((performance.now() - t0) / 1000);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setError("Microphone access was blocked. Allow the microphone for this site and try again.");
      setState("error");
    }
  };

  const stop = () => rec.current?.state === "recording" && rec.current.stop();

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => state !== "recording" && onClose()}>
      <div className="fade-up w-full max-w-[420px] overflow-hidden rounded-[16px] border border-line-strong bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="tz-stripe h-1" />
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-[18px] font-semibold">Record voice-over</h2>
            <p className="text-[12px] text-muted">Saved on this device and added to your media.</p>
          </div>
          <button aria-label="Close" disabled={state === "recording"} onClick={onClose} className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-white/5 disabled:opacity-30">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-5 p-6 text-center">
          <div className="font-mono text-[34px] tracking-tight">
            {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(Math.floor(secs % 60)).padStart(2, "0")}
          </div>
          <div className="mx-auto flex h-10 max-w-[260px] items-center gap-[3px]">
            {Array.from({ length: 32 }).map((_, i) => {
              const h = state === "recording" ? Math.max(0.08, Math.min(1, level * 2.2 * (0.6 + 0.4 * Math.sin(i * 1.3 + secs * 9)))) : 0.08;
              return <span key={i} className="flex-1 rounded-full bg-accent transition-[height] duration-75" style={{ height: `${h * 100}%` }} />;
            })}
          </div>
          {state !== "recording" ? (
            <button onClick={start} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger text-white shadow-lg transition hover:scale-105" aria-label="Start recording">
              <span className="h-6 w-6 rounded-full bg-white" />
            </button>
          ) : (
            <button onClick={stop} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white shadow-lg transition hover:scale-105" aria-label="Stop recording">
              <span className="h-6 w-6 rounded-[4px] bg-danger" />
            </button>
          )}
          {take && state === "done" && (
            <div className="space-y-3">
              <audio src={take.url} controls className="w-full" />
              <div className="flex justify-center gap-2">
                <button onClick={start} className="btn-ghost !py-2 text-[13px]">
                  Record again
                </button>
                <button
                  onClick={() => {
                    onDone(take.file);
                    onClose();
                  }}
                  className="btn-primary !py-2 text-[13px]"
                >
                  Add to media
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-[12px] text-[#ffb3a8]">{error}</p>}
        </div>
      </div>
    </div>
  );
}
