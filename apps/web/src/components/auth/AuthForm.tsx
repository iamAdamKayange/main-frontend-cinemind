"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Photo } from "@/components/visual/Photo";
import { ArrowRight, Eye, EyeOff } from "@/components/ui/icons";
import { API_URL, api, setSession, type User } from "@/lib/api";
import { PHOTOS } from "@/lib/photos";
import { useI18n } from "@/lib/i18n";

const copy = {
  en: {
    login: { title: "Welcome back.", sub: "Sign in to continue your projects.", cta: "Sign in", alt: "New to CineMind?", altLink: "Create an account" },
    signup: { title: "Start creating.", sub: "Free account. Same projects on web, desktop and mobile.", cta: "Create account", alt: "Already have an account?", altLink: "Sign in" },
    name: "Name",
    email: "Email",
    password: "Password",
    hint: "At least 8 characters",
    or: "or with email",
    google: "Continue with Google",
    facebook: "Continue with Facebook",
    soon: "Not configured on this server yet",
  },
  sw: {
    login: { title: "Karibu tena.", sub: "Ingia kuendelea na projects zako.", cta: "Ingia", alt: "Mgeni kwenye CineMind?", altLink: "Fungua akaunti" },
    signup: { title: "Anza kuunda.", sub: "Akaunti ya bure. Projects zilezile kwenye wavuti, desktop na simu.", cta: "Fungua akaunti", alt: "Una akaunti tayari?", altLink: "Ingia" },
    name: "Jina",
    email: "Barua pepe",
    password: "Nenosiri",
    hint: "Angalau herufi 8",
    or: "au kwa barua pepe",
    google: "Endelea na Google",
    facebook: "Endelea na Facebook",
    soon: "Bado haijawekwa kwenye server hii",
  },
};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useI18n();
  const c = copy[lang];
  const m = c[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [social, setSocial] = useState<{ google: boolean; facebook: boolean } | null>(null);

  useEffect(() => {
    api<{ google: boolean; facebook: boolean }>("GET", "/auth/providers").then(setSocial, () => setSocial({ google: false, facebook: false }));
  }, []);

  const startOAuth = (p: "google" | "facebook") => {
    const next = params.get("next");
    try {
      if (next?.startsWith("/")) sessionStorage.setItem("cm-next", next);
    } catch {
      /* ignore */
    }
    const isTauri = "__TAURI_INTERNALS__" in window;
    const redirect = isTauri ? "cinemind-desktop://auth" : `${window.location.origin}/auth/callback`;
    window.location.assign(`${API_URL}/api/v1/auth/oauth/${p}/start?redirect=${encodeURIComponent(redirect)}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ accessToken: string; user: User }>(
        "POST",
        mode === "login" ? "/auth/login" : "/auth/register",
        mode === "login" ? { email, password } : { email, password, displayName: name },
      );
      setSession(r.accessToken, r.user);
      const next = params.get("next");
      router.push(next && next.startsWith("/") ? next : "/projects");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-[100dvh] bg-bg lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 md:px-14">
        <Logo />
        <div className="my-auto w-full max-w-[400px] py-16">
          <h1 className="display text-[clamp(40px,5vw,56px)]">{m.title}</h1>
          <p className="mt-3 text-[15px] text-soft">{m.sub}</p>
          <div className="mt-10 grid gap-3">
            {(["google", "facebook"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => startOAuth(p)}
                disabled={!social?.[p]}
                title={social && !social[p] ? c.soon : undefined}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-surface px-4 py-3 text-[14px] font-semibold transition hover:border-accent/50 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {p === "google" ? <GoogleIcon /> : <FacebookIcon />}
                {p === "google" ? c.google : c.facebook}
              </button>
            ))}
          </div>
          <div className="my-7 flex items-center gap-4 text-[12px] text-faint">
            <span className="h-px flex-1 bg-line" />
            {c.or}
            <span className="h-px flex-1 bg-line" />
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && <Field label={c.name} value={name} onChange={setName} autoComplete="name" />}
            <Field label={c.email} type="email" value={email} onChange={setEmail} autoComplete="email" required />
            <Field label={c.password} type="password" value={password} onChange={setPassword} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} hint={mode === "signup" ? c.hint : undefined} />
            {error && <p className="rounded-[10px] border border-danger/40 bg-danger/10 px-4 py-3 text-[13px] text-[#ffb3a8]">{error}</p>}
            <button disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">
              {busy ? "…" : m.cta} <ArrowRight size={16} />
            </button>
          </form>
          <p className="mt-8 text-[14px] text-muted">
            {m.alt}{" "}
            <Link href={mode === "login" ? "/signup" : "/login"} className="font-semibold text-accent hover:underline">
              {m.altLink}
            </Link>
          </p>
        </div>
        <div className="tz-stripe h-1 w-24 rounded-full" />
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <Photo photo={mode === "login" ? PHOTOS.dhowSunset : PHOTOS.tzConcert} kenBurns priority sizes="55vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/10 to-transparent" />
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void; hint?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const isPassword = rest.type === "password";
  const [show, setShow] = useState(false);
  const { lang } = useI18n();
  const toggleLabel = show ? (lang === "sw" ? "Ficha nenosiri" : "Hide password") : lang === "sw" ? "Onyesha nenosiri" : "Show password";
  return (
    <div className="block">
      <label className="block">
        <span className="text-[13px] font-semibold text-soft">{label}</span>
        <span className="relative mt-1.5 block">
          <input
            {...rest}
            type={isPassword && show ? "text" : rest.type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-[12px] border border-line-strong bg-surface px-4 py-3 text-[15px] outline-none transition placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent/15 ${isPassword ? "pr-12" : ""}`}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={toggleLabel}
              aria-pressed={show}
              title={toggleLabel}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-text"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </span>
      </label>
      {hint && <span className="mt-1 block text-[12px] text-faint">{hint}</span>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#fff" d="M15.1 12.6l.4-2.7h-2.6V8.2c0-.7.4-1.5 1.5-1.5h1.2V4.4s-1.1-.2-2.1-.2c-2.2 0-3.6 1.3-3.6 3.7v2h-2.4v2.7h2.4V19h2.9v-6.4h2.3z" />
    </svg>
  );
}
