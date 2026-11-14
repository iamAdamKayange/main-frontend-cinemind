"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/brand/Logo";
import { Photo } from "@/components/visual/Photo";
import { ArrowRight, Film, Plus, Trash } from "@/components/ui/icons";
import { api, clearSession, getToken, getUser } from "@/lib/api";

const noop = () => () => {};
import { PHOTOS } from "@/lib/photos";
import { useI18n } from "@/lib/i18n";

interface ProjectRow {
  id: string;
  title: string;
  aspect: string;
  version: number;
  assetCount: number;
  updatedAt: string;
  thumbUrl: string | null;
}

const T = {
  en: { yours: "Your projects", title: "Pick up where you left off.", sub: "Every project syncs across the website, desktop and mobile apps.", new: "New project", name: "Project name", ph: "e.g. Bongo Nights music video", format: "Format", create: "Create", cancel: "Cancel", empty: "No projects yet — create your first one.", demo: "Try the demo editor", signOut: "Sign out", media: "media", edited: "Edited", formats: ["Landscape", "Vertical", "Square"] },
  sw: { yours: "Projects zako", title: "Endelea ulipoishia.", sub: "Kila project inaoanishwa kwenye wavuti, desktop na simu.", new: "Project mpya", name: "Jina la project", ph: "mf. Video ya Bongo Nights", format: "Muundo", create: "Unda", cancel: "Ghairi", empty: "Bado huna project — unda ya kwanza.", demo: "Jaribu editor ya demo", signOut: "Toka", media: "media", edited: "Imehaririwa", formats: ["Mlalo", "Wima", "Mraba"] },
};

const ASPECTS = [
  { id: "16:9", w: 32, h: 18 },
  { id: "9:16", w: 14, h: 24 },
  { id: "1:1", w: 20, h: 20 },
];

const FALLBACKS = [PHOTOS.tzStage, PHOTOS.dhowSunset, PHOTOS.kilimanjaro, PHOTOS.darDusk, PHOTOS.zanzibarBeach, PHOTOS.acaciaSunset];

export function ProjectsView() {
  const router = useRouter();
  const { lang } = useI18n();
  const t = T[lang];
  const email = useSyncExternalStore(noop, () => getUser()?.email ?? null, () => null);
  const [items, setItems] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [aspect, setAspect] = useState("16:9");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/projects");
      return;
    }
    api<{ items: ProjectRow[] }>("GET", "/projects")
      .then((r) => setItems(r.items))
      .catch((e) => {
        if (e.status === 401) router.replace("/login?next=/projects");
        else setError(e.message);
      });
  }, [router]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await api<{ id: string }>("POST", "/projects", { title: title.trim() || "Untitled project", aspect });
      router.push(`/editor?project=${r.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Archive this project?")) return;
    await api("DELETE", `/projects/${id}`).catch((e) => setError(e.message));
    setItems((xs) => xs?.filter((x) => x.id !== id) ?? null);
  };

  const fmtDate = (s: string) => new Date(s).toLocaleString(lang === "sw" ? "sw-TZ" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="min-h-[100dvh] bg-bg">
      <header className="relative border-b border-line">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-5 md:px-10">
          <Logo />
          <div className="flex items-center gap-5 text-[13px]">
            <span className="hidden text-muted sm:inline">{email}</span>
            <button
              onClick={() => {
                clearSession();
                router.push("/login");
              }}
              className="text-soft hover:text-text"
            >
              {t.signOut}
            </button>
          </div>
        </div>
        <div className="tz-stripe absolute inset-x-0 bottom-0 h-[2px] opacity-70" />
      </header>
      <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="eyebrow">{t.yours}</p>
            <h1 className="display mt-3 text-[clamp(40px,5vw,64px)]">{t.title}</h1>
          </div>
          <div className="flex flex-col items-start gap-3">
            <p className="max-w-[340px] text-[14px] text-soft">{t.sub}</p>
            <Link href="/editor" className="link-arrow">
              {t.demo} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        {error && <p className="mt-8 rounded-[12px] border border-danger/40 bg-danger/10 px-4 py-3 text-[13px] text-[#ffb3a8]">{error}</p>}

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {!creating ? (
            <button onClick={() => setCreating(true)} className="group flex min-h-[270px] flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-line-strong text-soft transition-colors hover:border-accent/60 hover:text-accent">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-current transition-transform group-hover:scale-110">
                <Plus size={20} />
              </span>
              <span className="text-[15px] font-semibold">{t.new}</span>
            </button>
          ) : (
            <form onSubmit={create} className="fade-up flex min-h-[270px] flex-col rounded-[18px] border border-accent/40 bg-surface p-5">
              <label className="text-[12px] font-semibold text-muted" htmlFor="np-title">
                {t.name}
              </label>
              <input id="np-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.ph} className="mt-2 rounded-[10px] border border-line bg-bg-deep px-3 py-2.5 text-[14px] outline-none placeholder:text-faint focus:border-accent/60" />
              <p className="mt-5 text-[12px] font-semibold text-muted">{t.format}</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {ASPECTS.map((a, i) => (
                  <button type="button" key={a.id} onClick={() => setAspect(a.id)} className={`flex flex-col items-center gap-2 rounded-[10px] border py-3 text-[11px] ${aspect === a.id ? "border-accent text-accent" : "border-line text-muted"}`}>
                    <span className="rounded-[2px] border border-current" style={{ width: a.w, height: a.h }} />
                    {t.formats[i]}
                  </button>
                ))}
              </div>
              <div className="mt-auto flex gap-2 pt-5">
                <button type="submit" className="btn-primary flex-1 justify-center !py-2 text-[13px]">
                  {t.create} <ArrowRight size={14} />
                </button>
                <button type="button" onClick={() => setCreating(false)} className="btn-ghost !py-2 text-[13px]">
                  {t.cancel}
                </button>
              </div>
            </form>
          )}

          {items === null && !error && [0, 1].map((i) => <div key={i} className="min-h-[270px] animate-pulse rounded-[18px] bg-surface" />)}

          {items?.map((p, i) => (
            <div key={p.id} className="group relative overflow-hidden rounded-[18px] border border-line bg-surface transition-colors hover:border-accent/40">
              <Link href={`/editor?project=${p.id}`}>
                <div className="relative aspect-video overflow-hidden bg-bg-deep">
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    {p.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Photo photo={FALLBACKS[i % FALLBACKS.length]} sizes="400px" className="opacity-60" />
                    )}
                  </div>
                  <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 font-mono text-[10px] text-white/80">{p.aspect}</span>
                </div>
                <div className="p-5">
                  <p className="font-display text-[17px] font-semibold tracking-[-0.01em] group-hover:text-accent">{p.title}</p>
                  <p className="mt-1 flex justify-between text-[12px] text-muted">
                    <span>
                      {t.edited} {fmtDate(p.updatedAt)}
                    </span>
                    <span className="flex items-center gap-1 text-faint">
                      <Film size={12} /> {p.assetCount} {t.media} · v{p.version}
                    </span>
                  </p>
                </div>
              </Link>
              <button onClick={() => remove(p.id)} aria-label="Archive project" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white/80 opacity-0 transition group-hover:opacity-100 hover:text-danger">
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>
        {items?.length === 0 && <p className="mt-8 text-[14px] text-muted">{t.empty}</p>}
      </div>
    </main>
  );
}
