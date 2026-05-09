"use client";

import type { StepKind } from "@/lib/types";

/**
 * Step-aware loading screen — sits between user-action and the agent's
 * next tool call. Copy is step-specific so the wait feels intentional,
 * not stuck. Visual register matches the capture screen's breathing halo.
 */
const COPY: Record<Exclude<StepKind, "capture">, { kicker: string; line: string }> = {
  "gap-fill": {
    kicker: "listening",
    line: "sitting with what you said…",
  },
  "sensitivity-check": {
    kicker: "holding space",
    line: "taking this gently…",
  },
  archetype: {
    kicker: "considering",
    line: "naming the shape of this dream…",
  },
  probe: {
    kicker: "asking",
    line: "finding the question only this dream answers…",
  },
  interpret: {
    kicker: "trying it on",
    line: "a frame to offer, not a verdict…",
  },
  takeaway: {
    kicker: "distilling",
    line: "one line you can carry into today…",
  },
};

export function LoadingStep({ awaiting }: { awaiting: Exclude<StepKind, "capture"> }) {
  const copy = COPY[awaiting];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
      <p className="kicker">{copy.kicker}</p>

      <div className="relative grid h-44 w-44 place-items-center sm:h-52 sm:w-52">
        <span
          aria-hidden
          className="glow-halo absolute inset-0 rounded-full bg-[radial-gradient(circle,oklch(from_var(--primary)_l_c_h/0.25)_0%,transparent_70%)]"
        />
        <span
          aria-hidden
          className="absolute inset-6 animate-ping rounded-full border border-foreground/20"
          style={{ animationDuration: "3s" }}
        />
        <span
          aria-hidden
          className="absolute inset-12 animate-ping rounded-full border border-dashed border-foreground/15"
          style={{ animationDuration: "3.6s", animationDelay: "0.4s" }}
        />
        {/* Three breathing dots — softer than a spinner */}
        <div className="relative flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: `${i * 0.18}s`, animationDuration: "1.4s" }}
            />
          ))}
        </div>
      </div>

      <p className="max-w-md font-serif-italic text-[22px] leading-snug text-foreground/85 sm:text-[26px] lg:text-[30px]">
        {copy.line}
      </p>

      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        the agent is choosing what to render
      </p>
    </div>
  );
}
