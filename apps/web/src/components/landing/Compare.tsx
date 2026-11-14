"use client";

import { Check } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "./Reveal";

export function Compare() {
  const { t } = useI18n();
  return (
    <section className="border-t border-line bg-bg-deep">
      <div className="mx-auto max-w-[1320px] px-6 py-28 md:px-10">
        <Reveal className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <h2 className="display text-[clamp(40px,5vw,68px)]">
            {t.compare.title[0]}
            <br />
            <em>{t.compare.title[1]}</em>
          </h2>
          <p className="max-w-[460px] text-[15px] text-soft">{t.compare.body}</p>
        </Reveal>
        <Reveal className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-[14px]">
            <thead>
              <tr className="text-[12px] uppercase tracking-[0.1em] text-muted">
                {t.compare.head.map((h, i) => (
                  <th key={h} className={`border-b border-line px-5 py-4 font-semibold ${i === 2 ? "rounded-t-[14px] bg-surface-2 text-accent" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.compare.rows.map(([task, manual, cine], r) => (
                <tr key={task}>
                  <td className="border-b border-line px-5 py-5 font-semibold text-text">{task}</td>
                  <td className="border-b border-line px-5 py-5 text-muted">{manual}</td>
                  <td className={`border-b border-line bg-surface-2 px-5 py-5 text-text ${r === t.compare.rows.length - 1 ? "rounded-b-[14px]" : ""}`}>
                    <span className="flex items-start gap-2.5">
                      <Check size={15} className="mt-0.5 shrink-0 text-green-text" />
                      {cine}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 text-[12px] text-faint">{t.compare.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
