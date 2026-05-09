"use client";

import { Button } from "@/components/ui/button";
import type { SensitivityFlagSpec } from "@/lib/types";
import { playChime } from "@/lib/sfx";

export function SensitivityCheckStep({
  spec,
  onContinue,
}: {
  spec: SensitivityFlagSpec;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-10 pt-4 sm:pt-8">
      <div className="my-auto text-center">
        <p className="kicker">a moment, before we go on</p>
        <h2 className="mt-4 font-serif-italic text-3xl leading-[1.15] sm:text-4xl lg:text-5xl">
          {spec.acknowledgment}
        </h2>
      </div>

      <Button
        onClick={() => {
          playChime();
          onContinue();
        }}
        size="lg"
      >
        {spec.continue_label}
      </Button>
    </div>
  );
}
