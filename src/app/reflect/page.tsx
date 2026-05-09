"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DreamSession } from "@/components/DreamSession";
import { Providers } from "@/components/Providers";

function ReflectInner() {
  const params = useSearchParams();
  const mode = params.get("mode") === "evening" ? "evening" : "morning";
  return (
    <Providers mode={mode}>
      <DreamSession mode={mode} />
    </Providers>
  );
}

export default function ReflectPage() {
  return (
    <Suspense fallback={null}>
      <ReflectInner />
    </Suspense>
  );
}
