"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GapFillSpec } from "@/lib/types";
import { cn } from "@/lib/utils";
import { playChime } from "@/lib/sfx";

export function GapFillStep({
  spec,
  onAnswer,
}: {
  spec: GapFillSpec;
  onAnswer: (answer: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col gap-10 pt-4 sm:pt-8">
      <div className="text-center">
        <p className="kicker">{spec.kicker}</p>
        <h2 className="mt-4 font-serif-italic text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">
          {spec.question}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {spec.body}
        </p>
      </div>

      <div className="my-auto flex flex-col gap-2.5">
        {spec.chips.map((chip) => {
          const isSelected = picked === chip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => {
                playChime();
                setPicked(chip);
              }}
              className={cn(
                "w-full rounded-full px-5 py-3.5 text-sm font-medium transition-all sm:text-base",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_oklch(from_var(--primary)_l_c_h/0.35)]"
                  : "border border-border bg-card/40 text-foreground hover:bg-card/70"
              )}
            >
              {chip}
            </button>
          );
        })}
      </div>

      <Button disabled={!picked} onClick={() => picked && onAnswer(picked)} size="lg">
        next
      </Button>
    </div>
  );
}
