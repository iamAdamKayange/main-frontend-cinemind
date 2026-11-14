"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setSession, type User } from "@/lib/api";

/** Receives the session from Google/Facebook sign-in (passed in the URL fragment). */
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    // Clear the fragment so the token doesn't stay in history.
    window.history.replaceState(null, "", window.location.pathname);
    const token = h.get("token");
    const user = h.get("user");
    if (!token || !user) {
      Promise.resolve().then(() => setError(h.get("error") ?? "Sign-in failed."));
      return;
    }
    try {
      const json = atob(user.replace(/-/g, "+").replace(/_/g, "/"));
      setSession(token, JSON.parse(new TextDecoder().decode(Uint8Array.from(json, (c) => c.charCodeAt(0)))) as User);
    } catch {
      Promise.resolve().then(() => setError("Sign-in failed."));
      return;
    }
    let next = "/projects";
    try {
      const n = sessionStorage.getItem("cm-next");
      if (n?.startsWith("/")) next = n;
      sessionStorage.removeItem("cm-next");
    } catch {
      /* ignore */
    }
    router.replace(next);
  }, [router]);

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-bg text-center">
      <div>
        <div className={`tz-stripe mx-auto h-1 w-24 rounded-full ${error ? "" : "animate-pulse"}`} />
        <p className="mt-5 text-[14px] text-soft">{error ?? "Signing you in…"}</p>
        {error && (
          <Link href="/login" className="link-arrow mt-4">
            Back to sign in
          </Link>
        )}
      </div>
    </main>
  );
}
