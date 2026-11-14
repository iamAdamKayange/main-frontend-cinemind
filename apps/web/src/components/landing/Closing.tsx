"use client";

import Link from "next/link";
import { useState } from "react";
import { Photo } from "@/components/visual/Photo";
import { Logo } from "@/components/brand/Logo";
import { ArrowRight, Plus } from "@/components/ui/icons";
import { PHOTOS } from "@/lib/photos";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "./Reveal";

export function Principles() {
  const { t } = useI18n();
  const colors = ["text-accent", "text-green-text", "text-sun", "text-coral"];
  return (
    <section className="border-t border-line bg-bg-deep">
      <div className="mx-auto grid max-w-[1320px] gap-14 px-6 py-28 md:px-10 lg:grid-cols-[1fr_1.3fr]">
        <Reveal>
          <h2 className="display text-[clamp(40px,5vw,68px)]">
            {t.principles.title[0]}
            <br />
            {t.principles.title[1]}
            <br />
            <em>{t.principles.title[2]}</em>
          </h2>
        </Reveal>
        <div className="grid gap-x-10 sm:grid-cols-2">
          {t.principles.items.map(([title, body], i) => (
            <Reveal key={title} delay={i * 80}>
              <div className="border-t border-line py-7">
                <h3 className={`font-display text-[19px] font-semibold tracking-[-0.01em] ${colors[i]}`}>{title}</h3>
                <p className="mt-3 text-[15px] text-soft">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-line bg-bg">
      <div className="mx-auto grid max-w-[1320px] gap-14 px-6 py-28 md:px-10 lg:grid-cols-[1fr_1.5fr]">
        <Reveal>
          <h2 className="display text-[clamp(40px,5vw,68px)]">{t.faq.title}</h2>
          <div className="kanga-rule mt-8 max-w-[240px]" />
        </Reveal>
        <div>
          {t.faq.items.map(([q, a], i) => (
            <div key={q} className="border-t border-line">
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-6 py-6 text-left">
                <span className="font-display text-[19px] font-medium tracking-[-0.01em]">{q}</span>
                <Plus size={18} className={`shrink-0 text-accent transition-transform duration-300 ${open === i ? "rotate-45" : ""}`} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-400 ${open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <p className="overflow-hidden pb-0 text-[15px] text-soft">
                  <span className="block pb-6">{a}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const { t } = useI18n();
  return (
    <section className="grain relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Photo photo={PHOTOS.giraffeSunset} kenBurns />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#030b0e]/90 via-[#030b0e]/55 to-[#030b0e]/10" />
      <div className="mx-auto grid max-w-[1320px] gap-10 px-6 py-40 md:px-10 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <Reveal>
          <h2 className="display text-[clamp(52px,7.5vw,104px)]">
            {t.final.title[0]}
            <br />
            {t.final.title[1]}
            <br />
            <em>{t.final.title[2]}</em>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="max-w-[400px] text-[15px] text-soft">{t.final.body}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signup" className="btn-primary">
              {t.final.cta} <ArrowRight size={16} />
            </Link>
            <Link href="/editor" className="btn-ghost backdrop-blur-sm">
              {t.final.cta2}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative border-t border-line bg-bg-deep">
      <div className="tz-stripe absolute inset-x-0 top-0 h-1" />
      <div className="mx-auto grid max-w-[1320px] gap-12 px-6 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:px-10">
        <div>
          <Logo />
          <p className="mt-4 max-w-[300px] text-[13px] text-muted">{t.footer.tagline}</p>
        </div>
        {t.footer.cols.map(([h, items]) => (
          <div key={h}>
            <p className="text-[13px] font-semibold text-text">{h}</p>
            <ul className="mt-4 space-y-2.5 text-[13px] text-muted">
              {items.map((i) => (
                <li key={i}>
                  <a href="#" className="hover:text-text">
                    {i}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-3 border-t border-line px-6 py-6 text-[12px] text-faint md:px-10">
        <span>© 2026 CineMind AI · Dar es Salaam, Tanzania</span>
        <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="hover:text-soft">
          {t.footer.credit}
        </a>
      </div>
    </footer>
  );
}
