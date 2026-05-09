"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { InterpretSpec } from "@/lib/types";
import { cn } from "@/lib/utils";
import { playChime } from "@/lib/sfx";

const SCALE = ["no", "sort of", "close", "yes", "exactly"];

export function InterpretStep({
  spec,
  onResonance,
}: {
  spec: InterpretSpec;
  onResonance: (label: string) => void;
}) {
  const [pick, setPick] = useState<number | null>(null);

  return (
    <div className="flex flex-1 flex-col gap-8 pt-4 sm:pt-8">
      <div className="text-center">
        <p className="kicker">{spec.kicker}</p>
      </div>

      <blockquote className="my-2 border-l-[3px] border-primary pl-5 pr-2 sm:pl-6">
        <p className="font-serif text-[20px] font-light leading-[1.45] text-foreground sm:text-[24px] lg:text-[28px]">
          {spec.quote}
        </p>
        <p className="mt-4 font-serif text-[16px] leading-relaxed text-muted-foreground sm:text-[18px]">
          {spec.expansion}
        </p>
      </blockquote>

      <div className="mb-auto">
        <p className="text-center font-serif italic text-muted-foreground">
          does that land for you?
        </p>
        <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
          {SCALE.map((t, i) => (
            <button
              key={t}
              onClick={() => {
                playChime();
                setPick(i);
              }}
              className={cn(
                "rounded-xl px-2 py-3 text-[11.5px] font-medium transition-all sm:text-sm",
                pick === i
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card/40 text-muted-foreground hover:bg-card/70"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Button
        disabled={pick === null}
        onClick={() => pick !== null && onResonance(SCALE[pick])}
        size="lg"
      >
        carry this with me
      </Button>
    </div>
  );
}
