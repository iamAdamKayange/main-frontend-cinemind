"use client";

import { useI18n } from "@/lib/i18n";
import { Reveal } from "./Reveal";

/** Small looping illustrations, one per capability. */
function Glyph({ i }: { i: number }) {
  const common = "h-20 w-full";
  if (i === 0)
    return (
      <svg viewBox="0 0 200 60" className={common}>
        {Array.from({ length: 40 }).map((_, k) => (
          <rect key={k} x={k * 5} y={30 - (k % 8 === 0 ? 22 : 6 + (k % 3) * 3)} width="2.5" height={k % 8 === 0 ? 44 : 12 + (k % 3) * 6} rx="1.2" fill={k % 8 === 0 ? "var(--sun)" : "var(--accent)"} opacity={k % 8 === 0 ? 1 : 0.55} />
        ))}
        {[0, 40, 80, 120, 160].map((x) => (
          <line key={x} x1={x + 1} x2={x + 1} y1="0" y2="60" stroke="var(--green-text)" strokeWidth="1" strokeDasharray="2 3" />
        ))}
      </svg>
    );
  if (i === 1)
    return (
      <svg viewBox="0 0 200 60" className={common}>
        {Array.from({ length: 40 }).map((_, k) => {
          const silent = (k > 10 && k < 16) || (k > 26 && k < 31);
          return <rect key={k} x={k * 5} y={silent ? 28 : 12 + (k % 4) * 4} width="3" height={silent ? 4 : 36 - (k % 4) * 8} rx="1.5" fill={silent ? "var(--coral)" : "var(--accent)"} opacity={silent ? 0.9 : 0.6} />;
        })}
      </svg>
    );
  if (i === 2)
    return (
      <svg viewBox="0 0 200 60" className={common}>
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <rect x={k * 40 + 2} y="12" width="36" height="36" rx="4" fill={["#0f5a76", "#17652f", "#7d6206", "#0f5a76", "#17652f"][k]} />
            {k > 0 && <line x1={k * 40} x2={k * 40} y1="4" y2="56" stroke="var(--sun)" strokeWidth="2" />}
          </g>
        ))}
      </svg>
    );
  if (i === 3)
    return (
      <svg viewBox="0 0 200 60" className={common}>
        {[["Claude", 20], ["OpenAI", 82], ["Gemini", 144]].map(([l, x]) => (
          <g key={l as string}>
            <rect x={x as number} y="16" width="52" height="28" rx="14" fill="none" stroke="var(--accent)" opacity="0.7" />
            <text x={(x as number) + 26} y="34" textAnchor="middle" fontSize="10" fill="var(--text-soft)" fontFamily="var(--font-body)">
              {l}
            </text>
          </g>
        ))}
      </svg>
    );
  if (i === 4)
    return (
      <svg viewBox="0 0 200 60" className={common}>
        <line x1="10" x2="190" y1="30" y2="30" stroke="var(--line-strong)" strokeWidth="2" />
        {[10, 46, 82, 118, 154, 190].map((x, k) => (
          <circle key={x} cx={x} cy="30" r={k === 5 ? 7 : 5} fill={k === 5 ? "var(--green-text)" : "var(--surface-3)"} stroke="var(--accent)" />
        ))}
        <path d="M118 30 C 130 6, 160 6, 172 18" stroke="var(--sun)" fill="none" strokeDasharray="3 3" />
      </svg>
    );
  return (
    <svg viewBox="0 0 200 60" className={common}>
      <rect x="20" y="20" width="160" height="10" rx="5" fill="var(--surface-3)" />
      <rect x="20" y="20" width="118" height="10" rx="5" fill="url(#cap-grad)" />
      <defs>
        <linearGradient id="cap-grad" x1="0" x2="1">
          <stop offset="0" stopColor="var(--green)" />
          <stop offset="1" stopColor="var(--accent-strong)" />
        </linearGradient>
      </defs>
      <text x="20" y="50" fontSize="10" fill="var(--muted)" fontFamily="var(--font-code)">
        render 74% · 1080p · H.264
      </text>
    </svg>
  );
}

export function Capabilities() {
  const { t } = useI18n();
  return (
    <section id="ai" className="border-t border-line bg-bg-deep">
      <div className="mx-auto max-w-[1320px] px-6 py-28 md:px-10">
        <Reveal className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">{t.caps.eyebrow}</p>
            <h2 className="display mt-5 text-[clamp(40px,5vw,68px)]">
              {t.caps.title[0]}
              <br />
              <em>{t.caps.title[1]}</em>
            </h2>
          </div>
        </Reveal>
        <div className="mt-16 grid gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {t.caps.items.map(([title, body], i) => (
            <Reveal key={title} delay={i * 70} className="group h-full">
              <article className="h-full bg-bg-deep p-7 transition-colors duration-500 group-hover:bg-surface">
                <Glyph i={i} />
                <h3 className="mt-6 font-display text-[20px] font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-soft">{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
