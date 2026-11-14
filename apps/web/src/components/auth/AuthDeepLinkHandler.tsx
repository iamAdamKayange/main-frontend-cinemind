"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Route only CineMind's exact, configured desktop OAuth URI into the shared callback page. */
export function AuthDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    const accept = (raw: string) => {
      try {
        const link = new URL(raw);
        if (link.protocol !== "cinemind-desktop:" || link.hostname !== "auth" || link.pathname || link.search) return;
        router.replace(`/auth/callback${link.hash}`);
      } catch {
        // Ignore malformed or unrelated OS URL events.
      }
    };

    void import("@tauri-apps/plugin-deep-link").then(async ({ getCurrent, onOpenUrl }) => {
      const initial = await getCurrent();
      if (cancelled) return;
      for (const link of initial ?? []) accept(link);
      const stop = await onOpenUrl((urls) => urls.forEach(accept));
      if (cancelled) stop();
      else unlisten = stop;
    }).catch(() => {
      // Web and non-Tauri builds do not have the native deep-link plugin.
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [router]);

  return null;
}
