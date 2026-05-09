"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { StepKind } from "@/lib/types";

/**
 * One painterly watercolor backdrop per step. Sits absolutely behind the stage
 * content at low opacity, with a darken gradient to keep copy legible.
 *
 * Files live at /public/backdrops/<step>.png. The map below mirrors the
 * StepKind union — if you add a step, add a file with the matching slug.
 */
const BACKDROPS: Record<StepKind, string> = {
  capture: "/backdrops/capture.png",
  "gap-fill": "/backdrops/gap-fill.png",
  // sensitivity-check borrows gap-fill's backdrop — same neighborhood of the flow.
  "sensitivity-check": "/backdrops/gap-fill.png",
  archetype: "/backdrops/archetype.png",
  probe: "/backdrops/probe.png",
  interpret: "/backdrops/interpret.png",
  takeaway: "/backdrops/takeaway.png",
};

export function StepBackdrop({ step, className }: { step: StepKind; className?: string }) {
  const src = BACKDROPS[step];
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className
      )}
    >
      <Image
        key={src}
        src={src}
        alt=""
        fill
        priority={step === "capture"}
        sizes="(min-width: 1024px) 940px, 100vw"
        className="animate-in fade-in object-cover object-center opacity-40 duration-700"
      />
      {/* Darken wash so headlines and body copy stay readable on top */}
      <div className="absolute inset-0 bg-linear-to-b from-background/55 via-background/30 to-background/75" />
    </div>
  );
}
