"use client";

import { useState } from "react";
import { Photo } from "@/components/visual/Photo";
import { ArrowDown, ArrowRight, Check, Folder, Music } from "@/components/ui/icons";
import { PHOTOS } from "@/lib/photos";
import { useI18n } from "@/lib/i18n";
import { CineDot } from "./Hero";
import { Reveal } from "./Reveal";

const SHOTS = [
  { p: PHOTOS.tzStage, label: "Stage take 3" },
  { p: PHOTOS.streetVendor, label: "Kariakoo street take" },
  { p: PHOTOS.tzGuitarist, label: "Guitar close-up" },
  { p: PHOTOS.darDusk, label: "Dar dusk wide" },
];

export function Walkthrough() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const s = t.walk.steps[step];
  const hero = step === 3 ? PHOTOS.dhowSunset : SHOTS[step].p;

  return (
    <section id="walkthrough" className="border-t border-line bg-bg">
      <div className="mx-auto max-w-[1320px] px-6 py-28 md:px-10">
        <Reveal className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <h2 className="display text-[clamp(44px,6vw,84px)]">
            {t.walk.title[0]}
            <br />
            {t.walk.title[1]}
            <br />
            <em>{t.walk.title[2]}</em>
          </h2>
          <div>
            <p className="max-w-[420px] text-[15px] text-soft">{t.walk.body}</p>
            <span className="link-arrow mt-6">
              {t.walk.explore} <ArrowDown size={14} />
            </span>
          </div>
        </Reveal>

        <Reveal className="mt-16">
          <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-6 py-4 text-[13px]">
              <span className="flex items-center gap-3">
                <Folder size={15} className="text-green-text" />
                <span className="font-semibold text-text">Bongo Nights</span>
                <span className="ml-3 text-muted">{t.walk.project}</span>
              </span>
              <span className="text-muted">{t.walk.illustrative}</span>
            </div>

            <div className="grid grid-cols-2 border-b border-line md:grid-cols-4">
              {t.walk.steps.map((st, i) => (
                <button key={st.name} onClick={() => setStep(i)} className={`relative flex items-center gap-4 px-6 py-4 text-left text-[14px] transition-colors ${i === step ? "text-text" : "text-muted hover:text-soft"}`}>
                  <span className={`font-mono text-[12px] ${i === step ? "text-sun" : ""}`}>{i + 1}</span>
                  {st.name}
                  {i === step && <span className="tz-stripe absolute bottom-0 left-6 h-[3px] w-14 rounded-full" />}
                </button>
              ))}
            </div>

            <div key={step} className="fade-up grid lg:grid-cols-[1.7fr_1fr]">
              <div className="border-line p-6 lg:border-r">
                <div className="flex items-center justify-between text-[13px]">
                  <span>{step === 3 ? "Export" : step === 2 ? "Timeline · v7 → v8" : "Project library"}</span>
                  <span className="text-muted">4 shots · 1 song</span>
                </div>
                <div className="relative mt-4 aspect-[16/8.2] overflow-hidden rounded-[10px]">
                  <Photo photo={hero} sizes="(min-width:1024px) 60vw, 100vw" kenBurns />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[12px] text-white/90">{step === 3 ? "bongo-nights-1080p.mp4" : SHOTS[step].label}</span>
                  <span className="absolute bottom-3 right-3 font-mono text-[11px] text-white/80">00:00:42:10</span>
                  {step === 3 && (
                    <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-[12px] bg-black/60 p-4 backdrop-blur">
                      <div className="flex justify-between text-[12px]">
                        <span>Rendering</span>
                        <span className="text-ok">Completed</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/10">
                        <div className="tz-stripe h-1.5 w-full rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
                {step < 2 ? (
                  <div className="mt-3 grid grid-cols-4 gap-3">
                    {SHOTS.map((sh) => (
                      <figure key={sh.label}>
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[8px]">
                          <Photo photo={sh.p} sizes="200px" />
                        </div>
                        <figcaption className="mt-2 truncate text-[12px] text-soft">{sh.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <MiniTimeline after />
                )}
              </div>

              <div className="flex flex-col p-6">
                <div className="flex items-center gap-3">
                  <CineDot />
                  <span>
                    <span className="block text-[14px] font-semibold">Cine</span>
                    <span className="block text-[12px] text-muted">{t.walk.with}</span>
                  </span>
                </div>
                <p className="mt-6 font-display text-[22px] font-medium leading-snug tracking-[-0.02em]">
                  {s.quote.map((q) => (
                    <span key={q} className="block">
                      {q}
                    </span>
                  ))}
                </p>
                <p className="mt-4 text-[14px] text-soft">{s.body}</p>
                <div className="mt-6 border-t border-line pt-5">
                  <p className="flex items-center gap-2 text-[13px] font-semibold">
                    <Music size={14} className="text-sun" /> {s.noteTitle}
                  </p>
                  <ul className="mt-3 space-y-1.5 pl-6 text-[13px] text-soft">
                    {s.note.map((n) => (
                      <li key={n} className="flex gap-2">
                        {step >= 2 && <Check size={13} className="mt-1 text-green-text" />}
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => setStep((step + 1) % 4)} className="link-arrow mt-auto justify-between pt-8">
                  {s.cta} <ArrowRight size={15} />
                </button>
              </div>
            </div>
            <div className="flex justify-between border-t border-line px-6 py-3 text-[12px] text-muted">
              <span>{t.walk.material}</span>
              <span>{t.walk.interactive}</span>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-faint">{t.walk.note}</p>
        </Reveal>
      </div>
    </section>
  );
}

function MiniTimeline({ after }: { after: boolean }) {
  const v1 = after ? [12, 8, 10, 6, 14] : [22, 18, 20];
  return (
    <div className="mt-4 space-y-1.5 rounded-[10px] bg-bg-deep p-3">
      <div className="flex gap-1">
        <span className="w-6 text-[10px] text-muted">V1</span>
        <div className="flex flex-1 gap-0.5">
          {v1.map((w, i) => (
            <div key={i} className="h-7 rounded-[3px] ring-1 ring-white/10" style={{ flex: w, background: i % 2 ? "var(--clip-video)" : "#13708f" }} />
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        <span className="w-6 text-[10px] text-muted">A1</span>
        <div className="relative h-7 flex-1 overflow-hidden rounded-[3px] bg-[var(--clip-audio)]">
          <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="h-full w-full opacity-70">
            {Array.from({ length: 100 }).map((_, i) => {
              const h = Math.round((3 + Math.abs(Math.sin(i * 0.7) * 7 + Math.sin(i * 0.23) * 5)) * 10) / 10;
              return <rect key={i} x={i * 2} y={10 - h / 2} width="1" height={h} fill="#bdf5c8" />;
            })}
          </svg>
          {after && <div className="absolute inset-y-0 right-0 w-[12%] bg-gradient-to-r from-transparent to-black/60" />}
        </div>
      </div>
    </div>
  );
}
