"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProbeSpec } from "@/lib/types";
import { cn } from "@/lib/utils";
import { playChime } from "@/lib/sfx";

export function ProbeStep({
  spec,
  onAnswer,
}: {
  spec: ProbeSpec;
  onAnswer: (answer: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col gap-10 pt-4 sm:pt-8">
      <div className="text-center">
        <p className="kicker">{spec.kicker}</p>
        {spec.central_image && (
          <p className="mt-3 font-serif-italic text-lg text-muted-foreground sm:text-xl">
            {spec.central_image}
          </p>
        )}
        <h2 className="mt-4 font-serif-italic text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">
          {spec.question}
        </h2>
      </div>

      <div className="my-auto flex flex-col gap-2.5">
        {spec.options.map((opt) => {
          const isSelected = picked === opt;
          return (
            <button
              key={opt}
              onClick={() => {
                playChime();
                setPicked(opt);
              }}
              className={cn(
                "w-full rounded-full px-5 py-3.5 text-sm font-medium transition-all sm:text-base",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_oklch(from_var(--primary)_l_c_h/0.35)]"
                  : "border border-border bg-card/40 text-foreground hover:bg-card/70"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <Button disabled={!picked} onClick={() => picked && onAnswer(picked)} size="lg">
        answer
      </Button>
    </div>
  );
}
