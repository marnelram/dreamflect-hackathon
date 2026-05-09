import { ArrowLeft } from "lucide-react";
import { DreamflectMark } from "@/components/DreamflectMark";

export default function HistoryLoading() {
  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_30%_20%,oklch(from_var(--accent)_l_c_h/0.18)_0%,transparent_55%),radial-gradient(circle_at_70%_80%,oklch(from_var(--primary)_l_c_h/0.18)_0%,transparent_55%)]">
      <div className="mx-auto max-w-2xl px-6 py-12 lg:py-16">
        <header className="mb-12 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            today
          </span>
          <div className="flex items-center gap-2">
            <DreamflectMark className="h-4 w-4 text-primary" />
            <span className="font-serif-italic text-xl">dreamflect</span>
          </div>
        </header>

        <div className="mb-10">
          <p className="kicker">your dreams</p>
          <h1 className="mt-3 font-serif-italic text-4xl leading-[1.05] sm:text-5xl">
            gathering what you&rsquo;ve carried&hellip;
          </h1>
        </div>

        <ol className="space-y-4" aria-busy="true" aria-label="loading your dreams">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="animate-pulse rounded-2xl border border-border bg-card/40 p-5 backdrop-blur sm:p-6"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="block h-3 w-24 rounded-full bg-foreground/10" />
                <span className="block h-3 w-20 rounded-full bg-foreground/10" />
              </div>
              <span className="block h-5 w-11/12 rounded-full bg-foreground/10" />
              <span className="mt-2 block h-5 w-3/5 rounded-full bg-foreground/10" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
