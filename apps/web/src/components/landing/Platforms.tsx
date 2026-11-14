"use client";

import { Photo } from "@/components/visual/Photo";
import { ArrowRight, Cloud, Globe, Monitor, Phone } from "@/components/ui/icons";
import { PHOTOS } from "@/lib/photos";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "./Reveal";

const ICONS = [Globe, Monitor, Phone];

export function Platforms() {
  const { t } = useI18n();
  return (
    <section id="platforms" className="border-t border-line bg-bg">
      <div className="mx-auto max-w-[1320px] px-6 py-28 md:px-10">
        <Reveal className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <h2 className="display text-[clamp(40px,5.2vw,72px)]">
            {t.platforms.title[0]}
            <br />
            <em>{t.platforms.title[1]}</em>
          </h2>
          <p className="max-w-[420px] text-[15px] text-soft">{t.platforms.body}</p>
        </Reveal>

        <div className="mt-20 grid gap-12 md:grid-cols-3 md:gap-8">
          {t.platforms.items.map(([title, sub, body], i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={title} delay={i * 90}>
                <article>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] border border-line bg-surface">
                    <DeviceMock kind={i} />
                  </div>
                  <div className="mt-7 flex items-center gap-3">
                    <Icon size={18} className="text-accent" />
                    <h3 className="font-display text-[22px] font-semibold tracking-[-0.02em]">{title}</h3>
                  </div>
                  <p className="mt-1 text-[13px] text-muted">{sub}</p>
                  <p className="mt-4 text-[15px] text-soft">{body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-24">
          <div className="relative overflow-hidden rounded-[20px] border border-line bg-surface/70 p-8 md:p-10">
            <div className="tz-stripe absolute inset-x-0 top-0 h-1" />
            <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <div className="flex items-center gap-3 text-accent">
                  <Cloud size={18} />
                  <span className="text-[13px] font-semibold">{t.platforms.backend}</span>
                </div>
                <h3 className="mt-4 font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">{t.platforms.sync}</h3>
                <ol className="mt-8">
                  {t.platforms.flow.map((f, i) => (
                    <li key={f} className="flex items-baseline gap-5 border-t border-line py-3.5 text-[14px] text-soft">
                      <span className="w-5 font-mono text-[12px] text-sun">{i + 1}</span>
                      {f}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="eyebrow">{t.platforms.privacyTitle}</p>
                <ul className="mt-4">
                  {t.platforms.privacy.map(([k, v]) => (
                    <li key={k} className="border-t border-line py-4">
                      <p className="text-[15px] font-semibold text-text">{k}</p>
                      <p className="mt-1 text-[14px] text-soft">{v}</p>
                    </li>
                  ))}
                </ul>
                <a href="#walkthrough" className="link-arrow mt-6">
                  {t.walk.explore} <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function DeviceMock({ kind }: { kind: number }) {
  if (kind === 2) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_30%,#123744,#061317)]">
        <div className="relative h-[86%] w-[36%] overflow-hidden rounded-[22px] border-[3px] border-[#24414b] bg-bg-deep shadow-2xl">
          <div className="relative h-[46%]">
            <Photo photo={PHOTOS.zanzibarBeach} sizes="160px" />
          </div>
          <div className="space-y-1.5 p-2">
            <div className="h-1.5 w-2/3 rounded bg-white/20" />
            <div className="flex gap-1">
              <div className="h-4 flex-[3] rounded-sm bg-[var(--clip-video)]" />
              <div className="h-4 flex-[2] rounded-sm bg-[#13708f]" />
            </div>
            <div className="h-3 rounded-sm bg-[var(--clip-audio)]" />
            <div className="mt-2 rounded-md border border-accent/40 p-1.5">
              <div className="h-1 w-1/2 rounded bg-accent/70" />
              <div className="mt-1 h-1 w-4/5 rounded bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  const browser = kind === 0;
  const thumbs = [PHOTOS.tzStage, PHOTOS.kilimanjaro, PHOTOS.darDusk, PHOTOS.dhowSunset];
  return (
    <div className="absolute inset-0 p-5">
      <div className="flex h-full flex-col overflow-hidden rounded-[10px] border border-[#24414b] bg-bg-deep shadow-2xl">
        <div className="flex h-6 items-center gap-1.5 border-b border-line px-2.5">
          {browser ? (
            <>
              <span className="h-2 w-2 rounded-full bg-white/15" />
              <span className="h-2 w-2 rounded-full bg-white/15" />
              <span className="ml-3 h-2.5 flex-1 rounded-full bg-white/8" />
            </>
          ) : (
            <>
              <span className="text-[8px] text-muted">CineMind</span>
              <span className="ml-auto h-2 w-2 rounded-full bg-white/15" />
              <span className="h-2 w-2 rounded-full bg-white/15" />
            </>
          )}
        </div>
        <div className="grid flex-1 grid-cols-[1fr_2.4fr_1fr] gap-1 p-1.5">
          <div className="grid grid-cols-2 content-start gap-1">
            {thumbs.map((p) => (
              <div key={p.id} className="relative aspect-video overflow-hidden rounded-[2px]">
                <Photo photo={p} sizes="60px" />
              </div>
            ))}
          </div>
          <div className="relative overflow-hidden rounded-[3px]">
            <Photo photo={browser ? PHOTOS.tzConcert : PHOTOS.kiliZebras} sizes="300px" />
          </div>
          <div className="space-y-1 rounded-[2px] bg-surface p-1">
            <div className="h-1 w-3/4 rounded bg-accent/70" />
            <div className="h-1 w-full rounded bg-white/15" />
            <div className="h-1 w-5/6 rounded bg-white/15" />
            <div className="mt-2 h-5 rounded-sm border border-green/40" />
          </div>
        </div>
        <div className="space-y-1 border-t border-line p-1.5">
          <div className="flex gap-1">
            <div className="h-3 flex-[2] rounded-sm bg-[var(--clip-video)]" />
            <div className="h-3 flex-[3] rounded-sm bg-[#13708f]" />
            <div className="h-3 flex-[1] rounded-sm bg-[var(--clip-video)]" />
          </div>
          <div className="h-2.5 rounded-sm bg-[var(--clip-audio)]" />
        </div>
      </div>
    </div>
  );
}
