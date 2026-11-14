"use client";

import { useEffect, useRef, useState } from "react";
import { Photo } from "@/components/visual/Photo";
import { Check, Pause, Play, Sparkle } from "@/components/ui/icons";
import { PHOTOS, type Photo as PhotoT } from "@/lib/photos";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "./Reveal";

const LOOP = 20; // seconds
const BPM = 120;
const BEAT = 60 / BPM;
const CUT_START = 6;
const CUT_END = 17;
const SHOTS: PhotoT[] = [PHOTOS.tzStage, PHOTOS.tzConcert, PHOTOS.tzGuitarist, PHOTOS.darDusk, PHOTOS.dhowSunset, PHOTOS.tzSinger, PHOTOS.streetVendor, PHOTOS.darSkyline, PHOTOS.redStage, PHOTOS.zanzibarBeach, PHOTOS.giraffeSunset];
const PEAKS = Array.from({ length: 160 }, (_, i) => {
  const beat = Math.exp(-((i % 8) / 2.2));
  return Math.round((0.25 + 0.6 * beat + 0.15 * Math.abs(Math.sin(i * 1.7))) * 100) / 100;
});

const fmt = (t: number) => {
  const s = Math.floor(t);
  const f = Math.floor((t - s) * 30);
  return `00:00:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
};

/** A 20-second, code-driven "film" of Cine cutting a Bongo Flava video to the beat. */
export function DemoReel() {
  const { t } = useI18n();
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      acc += dt;
      if (acc > 1 / 30) {
        setTime((x) => (x + acc) % LOOP);
        acc = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible]);

  const cutIndex = time < CUT_START ? 0 : Math.min(SHOTS.length - 1, Math.floor((time - CUT_START) / (2 * BEAT)) + 1);
  const step = time < 3 ? 0 : time < CUT_START ? 1 : time < CUT_END ? 2 : 3;
  const beatPhase = (time % BEAT) / BEAT;
  const onBeat = beatPhase < 0.18;
  const cutsMade = time < CUT_START ? 0 : Math.min(11, Math.floor((time - CUT_START) / (2 * BEAT)) + 1);
  const analysed = Math.min(1, time / 3);

  return (
    <section id="reel" className="relative overflow-hidden border-t border-line bg-bg">
      <div className="pointer-events-none absolute -left-40 top-20 h-[480px] w-[480px] rounded-full bg-green/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[520px] w-[520px] rounded-full bg-accent-strong/10 blur-[140px]" />
      <div className="relative mx-auto grid max-w-[1320px] gap-14 px-6 py-28 md:px-10 lg:grid-cols-[0.85fr_1.4fr] lg:items-center">
        <Reveal>
          <p className="eyebrow">{t.reel.eyebrow}</p>
          <h2 className="display mt-5 text-[clamp(40px,4.6vw,64px)]">
            {t.reel.title[0]}
            <br />
            <em>{t.reel.title[1]}</em>
          </h2>
          <p className="mt-6 max-w-[440px] text-[15px] text-soft">{t.reel.body}</p>
          <ol className="mt-10 space-y-1">
            {t.reel.steps.map((s, i) => (
              <li key={s} className={`flex items-center gap-4 rounded-[10px] px-4 py-3 text-[14px] transition-all duration-500 ${i === step ? "bg-surface-2 text-text" : "text-muted"}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] transition-colors ${i < step ? "bg-green text-black" : i === step ? "bg-accent text-accent-ink" : "border border-line-strong"}`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </Reveal>

        <div ref={ref}>
          <div className="relative overflow-hidden rounded-[16px] border border-line-strong bg-black shadow-[0_40px_120px_-40px_rgba(0,163,221,0.45)]">
            {/* Picture */}
            <div className="relative aspect-video overflow-hidden">
              {SHOTS.map((s, i) => (
                <div key={s.id} className="absolute inset-0" style={{ opacity: i === cutIndex ? 1 : 0 }}>
                  <div key={i === cutIndex ? `on-${cutIndex}` : "idle"} className={`absolute inset-0 ${i === cutIndex ? "animate-[reel-cut_2s_ease-out_both]" : ""}`}>
                    <Photo photo={s} sizes="(min-width:1024px) 50vw, 100vw" eager={visible} />
                  </div>
                </div>
              ))}
              <div className={`absolute inset-0 bg-white transition-opacity duration-150 ${onBeat && time > CUT_START && time < CUT_END ? "opacity-[0.06]" : "opacity-0"}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
              {time < CUT_START && <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />}

              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[11px] backdrop-blur">
                <Sparkle size={12} className="text-sun" />
                <span className="text-soft">{step < 2 ? "Cine is listening…" : "Cine is cutting…"}</span>
              </div>
              <div className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1.5 font-mono text-[11px] text-soft backdrop-blur">{fmt(time)}</div>

              {/* Analysis overlay */}
              {time < CUT_START && (
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2">
                  <p className="text-center font-display text-[clamp(18px,2.4vw,28px)] font-semibold tracking-tight">
                    {step === 0 ? "midnight-bongo.wav" : `${Math.min(11, Math.floor(((time - 3) / 3) * 11))} shot changes found`}
                  </p>
                  <div className="mt-4 flex h-16 items-center gap-[3px]">
                    {PEAKS.slice(0, 80).map((p, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-full transition-colors duration-300"
                        style={{ height: `${p * 100}%`, background: i / 80 < analysed ? (i % 8 === 0 ? "var(--sun)" : "var(--accent)") : "rgba(255,255,255,0.18)" }}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-center font-mono text-[12px] text-sun">{analysed >= 1 ? "120.0 BPM · 4/4 · 40 beats" : "analysing…"}</p>
                </div>
              )}

              {/* Proposal */}
              {time >= CUT_END && (
                <div className="fade-up absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-black/70 py-1.5 pl-4 pr-1.5 text-[13px] backdrop-blur-md">
                  <span>11 cuts · on the beat</span>
                  <span className="btn-primary !px-4 !py-1.5 text-[12px]">
                    <Check size={13} /> Approve
                  </span>
                </div>
              )}
              {time >= CUT_START && time < CUT_END && (
                <div className="absolute bottom-5 left-6 font-display text-[clamp(16px,2vw,24px)] font-semibold tracking-wide text-white drop-shadow">
                  {cutIndex % 3 === 0 ? "BONGO NIGHTS" : ""}
                </div>
              )}
            </div>

            {/* Mini timeline */}
            <div className="border-t border-white/10 bg-[#04121a] p-3">
              <div className="relative space-y-1.5">
              <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-sun shadow-[0_0_8px_var(--sun)]" style={{ left: `${(time / LOOP) * 100}%` }} />
              <div className="relative flex h-3 items-end gap-0">
                {Array.from({ length: 40 }).map((_, i) => (
                  <span key={i} className="flex-1">
                    <span className={`mx-auto block w-px ${i % 4 === 0 ? "h-3 bg-sun/80" : "h-1.5 bg-white/25"}`} />
                  </span>
                ))}
              </div>
              <div className="relative h-7 overflow-hidden rounded-[4px] bg-white/[0.04]">
                {Array.from({ length: cutsMade }).map((_, i) => {
                  const start = i === 0 ? 0 : CUT_START + (i - 1) * 2 * BEAT;
                  const end = i === 0 ? CUT_START : CUT_START + i * 2 * BEAT;
                  return (
                    <span
                      key={i}
                      className="absolute inset-y-0 animate-[clip-in_0.35s_ease-out_both] rounded-[3px] border border-white/15"
                      style={{ left: `${(start / LOOP) * 100}%`, width: `${((end - start) / LOOP) * 100}%`, background: i % 2 ? "var(--clip-video)" : "#13708f" }}
                    />
                  );
                })}
              </div>
              <div className="relative flex h-7 items-center gap-[2px] overflow-hidden rounded-[4px] bg-[var(--clip-audio)] px-1">
                {PEAKS.map((p, i) => (
                  <span key={i} className="flex-1 rounded-full bg-[#bdf5c8]/70" style={{ height: `${p * 80}%` }} />
                ))}
              </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[12px] text-faint">
            <button onClick={() => setPlaying((p) => !p)} className="inline-flex items-center gap-2 text-soft hover:text-text">
              {playing ? <Pause size={11} /> : <Play size={11} />} {playing ? "Pause" : "Play"}
            </button>
            <span className="hidden sm:inline">{t.reel.caption}</span>
            <span className={`h-2 w-2 rounded-full transition-all ${onBeat ? "scale-150 bg-sun" : "bg-white/20"}`} />
          </div>
        </div>
      </div>
    </section>
  );
}
