"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ArchetypeSpec } from "@/lib/types";
import { archetypeImagePath } from "@/lib/archetype-image";

export function ArchetypeStep({
  spec,
  onConfirm,
}: {
  spec: ArchetypeSpec;
  onConfirm: (confirmed: boolean) => void;
}) {
  const symbolSrc = archetypeImagePath(spec.name);
  return (
    <div className="flex flex-1 flex-col gap-8 pt-4 sm:pt-8">
      <p className="text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
        based on what you shared,
        <br />
        this sounds like…
      </p>

      <Card className="my-auto w-full overflow-hidden text-center">
        <CardContent className="space-y-4 px-6 py-10 sm:px-10 sm:py-12">
          {symbolSrc && (
            <div
              aria-hidden
              className="relative mx-auto -mt-2 h-28 w-28 sm:h-32 sm:w-32"
            >
              {/* Soft halo behind the symbol */}
              <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,oklch(from_var(--primary)_l_c_h/0.25)_0%,transparent_70%)]" />
              <Image
                src={symbolSrc}
                alt=""
                fill
                sizes="128px"
                className="animate-in fade-in object-contain duration-700"
              />
            </div>
          )}
          <p className="kicker">{spec.category}</p>
          <h2 className="font-serif-italic text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
            {spec.name}
          </h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            {spec.description}
          </p>
          {spec.secondary_tag && (
            <div className="pt-3">
              <span className="inline-block rounded-full bg-primary/15 px-3 py-1.5 text-[11px] font-medium text-primary">
                + {spec.secondary_tag}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <p className="text-center font-serif italic text-muted-foreground">
          does that sound right?
        </p>
        <div className="flex gap-2.5">
          <Button onClick={() => onConfirm(true)} size="lg" className="flex-1">
            yes
          </Button>
          <Button onClick={() => onConfirm(false)} size="lg" variant="outline" className="flex-1">
            not quite…
          </Button>
        </div>
      </div>
    </div>
  );
}
