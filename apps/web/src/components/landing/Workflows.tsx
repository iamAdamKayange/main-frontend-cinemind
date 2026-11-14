"use client";

import Link from "next/link";
import { useState } from "react";
import { Photo } from "@/components/visual/Photo";
import { ArrowRight, Check } from "@/components/ui/icons";
import { PHOTOS, type Photo as PhotoT } from "@/lib/photos";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "./Reveal";

const SHOTS: PhotoT[][] = [
  [PHOTOS.tzStage, PHOTOS.tzConcert, PHOTOS.tzGuitarist, PHOTOS.tzSinger],
  [PHOTOS.streetVendor, PHOTOS.darBus, PHOTOS.tzSmile, PHOTOS.darAerial],
  [PHOTOS.acaciaSunset, PHOTOS.giraffeSunset, PHOTOS.safariSunset, PHOTOS.kiliZebras],
  [PHOTOS.zanzibarBeach, PHOTOS.dhowBeach, PHOTOS.coastAerial, PHOTOS.kilimanjaro],
];

export function Workflows() {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const w = t.workflows.items[active];
  const shots = SHOTS[active];
  const [main, setMain] = useState(0);

  return (
    <section id="workflows" className="border-t border-line bg-bg">
      <div className="mx-auto max-w-[1320px] px-6 py-28 md:px-10">
        <Reveal className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <h2 className="display text-[clamp(40px,5.2vw,72px)]">
            {t.workflows.title[0]}
            <br />
            <em>{t.workflows.title[1]}</em>
          </h2>
          <p className="max-w-[400px] text-[15px] text-soft">{t.workflows.body}</p>
        </Reveal>

        <div role="tablist" className="thin-scroll mt-16 flex gap-2 overflow-x-auto pb-1">
          {t.workflows.items.map((wf, i) => (
            <button
              key={wf.tab}
              role="tab"
              aria-selected={i === active}
              onClick={() => {
                setActive(i);
                setMain(0);
              }}
              className={`shrink-0 rounded-full border px-5 py-2.5 text-[14px] font-semibold transition-all ${
                i === active ? "border-transparent bg-text text-bg" : "border-line-strong text-soft hover:border-accent/50 hover:text-text"
              }`}
            >
              {wf.tab}
            </button>
          ))}
        </div>

        <div key={active} className="fade-up mt-12 grid gap-14 lg:grid-cols-[1.25fr_1fr]">
          <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
            <div className="relative aspect-[16/10]">
              <div key={main} className="absolute inset-0 fade-up">
                <Photo photo={shots[main]} sizes="(min-width:1024px) 55vw, 100vw" kenBurns />
              </div>
              <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[11px] text-soft backdrop-blur">{t.workflows.illustrative}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 p-2">
              {shots.map((s, i) => (
                <button key={s.id} onClick={() => setMain(i)} className={`relative aspect-video overflow-hidden rounded-[8px] ring-2 transition ${i === main ? "ring-accent" : "ring-transparent opacity-70 hover:opacity-100"}`}>
                  <Photo photo={s} sizes="200px" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow">{w.eyebrow}</p>
            <h3 className="display mt-4 text-[clamp(30px,3.4vw,46px)]">
              {w.title.map((x) => (
                <span key={x} className="block">
                  {x}
                </span>
              ))}
            </h3>
            <p className="mt-6 text-[15px] text-soft">{w.body}</p>
            <blockquote className="mt-8 rounded-[14px] border-l-4 border-sun bg-surface px-5 py-4 text-[16px] leading-relaxed text-text">“{w.prompt}”</blockquote>
            <div className="mt-6 rounded-[14px] border border-line bg-surface p-5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-accent">{t.workflows.proposed}</span>
                <span className="text-faint">{t.workflows.needs}</span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {w.plan.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[14px] text-soft">
                    <Check size={15} className="mt-1 shrink-0 text-green-text" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/editor" className="link-arrow mt-8">
              {t.workflows.open} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
