"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useI18n } from "@/lib/i18n";

export function Nav() {
  const { t, lang, setLang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const links = [
    { label: t.nav.workflows, href: "#workflows" },
    { label: t.nav.ai, href: "#ai" },
    { label: t.nav.platforms, href: "#platforms" },
    { label: t.nav.faq, href: "#faq" },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background,backdrop-filter,border-color] duration-500 ${
        scrolled ? "border-b border-line bg-[#0e1012]/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className={`mx-auto flex max-w-[1320px] items-center justify-between px-6 transition-[padding] duration-500 md:px-10 ${scrolled ? "py-3.5" : "py-6"}`}>
        <Logo />
        <nav className="hidden items-center gap-8 text-[13px] text-soft lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-text">
              {l.label}
            </a>
          ))}
          <span className="ml-1 flex items-center gap-3 text-[12px]" role="group" aria-label="Language">
            {(["en", "sw"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`border-b pb-0.5 uppercase transition-colors ${lang === l ? "border-accent text-accent" : "border-transparent text-faint hover:text-soft"}`}
              >
                {l}
              </button>
            ))}
          </span>
          <Link href="/login" className="text-soft hover:text-text">
            {t.nav.signIn}
          </Link>
          <Link href="/projects" className="rounded-[4px] bg-accent px-4 py-2 font-medium text-accent-ink transition hover:brightness-110">
            {t.nav.open}
          </Link>
        </nav>
        <div className="flex items-center gap-3 lg:hidden">
          <button onClick={() => setLang(lang === "en" ? "sw" : "en")} className="text-[12px] uppercase text-accent">
            {lang === "en" ? "sw" : "en"}
          </button>
          <Link href="/projects" className="rounded-[4px] bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-ink">
            {t.nav.open}
          </Link>
        </div>
      </div>
    </header>
  );
}
