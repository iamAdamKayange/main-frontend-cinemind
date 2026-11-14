"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/visual/Photo";
import { ArrowRight, Check, Pause, Play, Sparkle } from "@/components/ui/icons";
import { PHOTOS } from "@/lib/photos";
import { useI18n } from "@/lib/i18n";

const SLIDES = [PHOTOS.dhowSunset, PHOTOS.tzConcert, PHOTOS.darDusk];
const DURATION = 7000;

export function Hero() {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), DURATION);
    return () => clearTimeout(id);
  }, [index, paused]);

  const lines = t.hero.headlines[index];

  return (
    <section className="grain letterbox relative isolate min-h-[100svh] overflow-hidden bg-black">
      {SLIDES.map((p, i) => (
        <div key={p.id} className="absolute inset-0 -z-10 overflow-hidden transition-opacity duration-[1600ms]" style={{ opacity: i === index ? 1 : 0 }}>
          {/* key changes when the slide becomes active, restarting its push-in */}
          <div key={i === index ? `on-${index}` : "idle"} className={`absolute inset-0 ${i === index && !paused ? "ken-burns" : ""}`}>
            <Photo photo={p} priority={i === 0} />
          </div>
        </div>
      ))}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b0c0e]/90 via-[#0b0c0e]/50 to-[#0b0c0e]/20" />
      <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-bg to-transparent" />

      <div className="mx-auto grid max-w-[1320px] gap-14 px-6 pb-20 pt-36 md:px-10 lg:grid-cols-[1.15fr_1fr] lg:pt-44">
        <div>
          <h1 key={`${index}-${lines[0]}`} className="display fade-up min-h-[3.1em] text-[clamp(46px,6.6vw,92px)] drop-shadow-[0_2px_30px_rgba(0,0,0,0.35)]">
            {lines.map((l, i) => (
              <span key={l} className="block">
                {i === lines.length - 1 ? <em>{l}</em> : l}
              </span>
            ))}
          </h1>

          <div className="mt-8 flex items-center gap-3">
            {SLIDES.map((_, i) => (
              <button key={i} aria-label={`Headline ${i + 1}`} onClick={() => setIndex(i)} className="relative h-px w-16 overflow-hidden bg-white/25">
                {i === index && !paused && <span key={index} className="headline-bar absolute inset-0 bg-accent" style={{ ["--dur" as string]: `${DURATION}ms` }} />}
                {(i < index || (i === index && paused)) && <span className="absolute inset-0 bg-white/80" />}
              </button>
            ))}
            <button onClick={() => setPaused((p) => !p)} className="ml-4 inline-flex items-center gap-2 text-[12px] text-soft hover:text-text">
              {paused ? <Play size={11} /> : <Pause size={11} />}
              {paused ? t.hero.play : t.hero.pause}
            </button>
          </div>

          <div className="mt-12 flex max-w-[480px] gap-4">
            <CineDot />
            <p className="text-[15px] leading-[1.7] text-soft">
              <strong className="font-medium text-text">{t.hero.lead}</strong> {t.hero.body}
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="btn-primary">
              {t.hero.cta} <ArrowRight size={16} />
            </Link>
            <a href="#reel" className="btn-ghost backdrop-blur-sm">
              <Play size={12} /> {t.hero.cta2}
            </a>
          </div>
          <p className="mt-6 text-[12px] text-faint">{t.hero.platforms}</p>
        </div>

        <div className="flex flex-col justify-end gap-10 lg:pb-6">
          <PromptCard key={t.hero.prompt} prompt={t.hero.prompt} toast={t.hero.toast} />
          <div>
            <h2 className="pb-5 text-[18px] font-[450] tracking-[-0.015em] text-accent">{t.hero.audienceTitle}</h2>
            <ul>
              {t.hero.audiences.map(([title, body]) => (
                <li key={title}>
                  <a href="#workflows" className="group flex items-center justify-between gap-6 border-t border-white/12 py-5">
                    <span>
                      <span className="block text-[17px] tracking-[-0.01em] text-text transition-colors group-hover:text-accent">{title}</span>
                      <span className="mt-1 block text-[14px] text-soft/85">{body}</span>
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-accent transition-transform group-hover:translate-x-1" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CineDot({ size = 36 }: { size?: number }) {
  return (
    <span className="mt-1 grid shrink-0 place-items-center rounded-full border border-accent/50 bg-black/30 backdrop-blur" style={{ width: size, height: size }}>
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
    </span>
  );
}

/** A prompt that types itself, then resolves into a proposal toast. Loops. */
function PromptCard({ prompt, toast }: { prompt: string; toast: string }) {
  const [n, setN] = useState(0);
  const [phase, setPhase] = useState<"typing" | "thinking" | "done">("typing");

  useEffect(() => {
    if (phase === "typing") {
      if (n < prompt.length) {
        const id = setTimeout(() => setN(n + 1), 38);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setPhase("thinking"), 500);
      return () => clearTimeout(id);
    }
    if (phase === "thinking") {
      const id = setTimeout(() => setPhase("done"), 1400);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      setN(0);
      setPhase("typing");
    }, 4200);
    return () => clearTimeout(id);
  }, [n, phase, prompt]);

  return (
    <div className="hidden max-w-[440px] self-end rounded-[10px] border border-white/12 bg-black/45 p-4 shadow-2xl backdrop-blur-xl lg:block">
      <div className="flex items-center gap-2 text-[11px] text-accent">
        <Sparkle size={12} /> Cine
      </div>
      <p className={`mt-2 min-h-[44px] text-[14px] leading-snug text-text ${phase === "typing" ? "caret" : ""}`}>{prompt.slice(0, n)}</p>
      <div className="mt-3 h-8">
        {phase === "thinking" && (
          <div className="thinking flex items-center gap-1 text-[12px] text-soft">
            <span>●</span>
            <span>●</span>
            <span>●</span>
          </div>
        )}
        {phase === "done" && (
          <div className="fade-up flex items-center gap-2 rounded-[6px] border border-accent/30 bg-accent/10 px-3 py-1.5 text-[12px] text-accent">
            <Check size={13} /> {toast}
          </div>
        )}
      </div>
    </div>
  );
}
