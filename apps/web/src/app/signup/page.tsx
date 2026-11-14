import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Create account — CineMind AI" };

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-bg" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
