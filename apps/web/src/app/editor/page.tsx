import type { Metadata } from "next";
import { Suspense } from "react";
import { Editor } from "@/components/editor/Editor";

export const metadata: Metadata = { title: "Editor — CineMind AI" };

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="grid h-[100dvh] place-items-center bg-bg text-[13px] text-muted">Opening project…</div>}>
      <Editor />
    </Suspense>
  );
}
