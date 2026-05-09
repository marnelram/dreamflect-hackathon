import { cn } from "@/lib/utils";

export function ProgressDots({
  step,
  total = 6,
  className,
}: {
  step: number;
  total?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === step - 1;
        const done = i < step - 1;
        return (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              active && "w-6 bg-primary",
              done && "w-1.5 bg-foreground/50",
              !active && !done && "w-1.5 bg-foreground/15"
            )}
          />
        );
      })}
    </div>
  );
}
