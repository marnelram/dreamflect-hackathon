"use client";

import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressDots } from "@/components/ui/progress-dots";
import { StepBackdrop } from "@/components/StepBackdrop";
import { DreamflectMark } from "@/components/DreamflectMark";
import type {
  ArchetypeSpec,
  GapFillSpec,
  InterpretSpec,
  ProbeSpec,
  StepKind,
  TakeawaySpec,
} from "@/lib/types";

const STEPS: { kind: StepKind; label: string }[] = [
  { kind: "capture", label: "capture" },
  { kind: "gap-fill", label: "gap-fill" },
  { kind: "archetype", label: "archetype" },
  { kind: "probe", label: "probe" },
  { kind: "interpret", label: "interpret" },
  { kind: "takeaway", label: "takeaway" },
];

export type SessionJournal = {
  gapFill?: GapFillSpec | null;
  archetype?: ArchetypeSpec | null;
  probe?: ProbeSpec | null;
  interpret?: InterpretSpec | null;
  takeaway?: TakeawaySpec | null;
};

/**
 * Responsive shell. Desktop (lg+) gets a left timeline rail + a center stage.
 * Mobile/tablet gets a single column with a thin progress strip on top.
 * The rail surfaces what the agent has picked so far so the "every screen
 * is generated for this dream" story is visible at a glance.
 */
export function SessionShell({
  step,
  journal,
  children,
  isAuthenticated = true,
  authPending = false,
}: {
  step: StepKind;
  journal: SessionJournal;
  children: React.ReactNode;
  isAuthenticated?: boolean;
  authPending?: boolean;
}) {
  // Anonymous users hit the dream session before any sign-up; the history
  // tab is sign-in-only so it'd just bounce them. Hide it until they have
  // an account. While Better Auth is still resolving we hide too — avoids
  // a brief flicker if they're actually signed in.
  const showHistoryLink = isAuthenticated && !authPending;
  // sensitivity-check is a transitional acknowledgment that fires between
  // capture and gap-fill — it doesn't count as its own progress step.
  const indexedStep: StepKind = step === "sensitivity-check" ? "gap-fill" : step;
  const currentIndex = STEPS.findIndex((s) => s.kind === indexedStep);
  const stepNumber = currentIndex + 1;
  const showJournal = Boolean(
    journal.gapFill ||
      journal.archetype ||
      journal.probe ||
      journal.interpret ||
      journal.takeaway
  );

  return (
    <div className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_30%_20%,oklch(from_var(--accent)_l_c_h/0.18)_0%,transparent_55%),radial-gradient(circle_at_70%_80%,oklch(from_var(--primary)_l_c_h/0.18)_0%,transparent_55%)]">
      <div className="mx-auto grid h-full w-full max-w-[1280px] grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[300px_1fr] lg:grid-rows-1 xl:grid-cols-[340px_1fr]">
        {/* Mobile / tablet header strip */}
        <header className="flex items-center justify-between gap-4 px-5 pt-6 pb-3 lg:hidden">
          <div className="flex items-center gap-2">
            <DreamflectMark className="h-5 w-5 text-primary" />
            <span className="font-serif-italic text-lg">dreamflect</span>
          </div>
          <div className="flex items-center gap-3">
            <ProgressDots step={stepNumber} />
            {showHistoryLink && (
              <Link
                href="/history"
                aria-label="history"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Clock className="h-4 w-4" />
              </Link>
            )}
          </div>
        </header>

        {/* Desktop left rail */}
        <aside className="hidden lg:flex lg:flex-col lg:gap-10 lg:border-r lg:border-border/60 lg:px-8 lg:py-12">
          <div className="flex items-center gap-2">
            <DreamflectMark className="h-7 w-7 text-primary" />
            <span className="font-serif-italic text-2xl">dreamflect</span>
          </div>

          <nav>
            <p className="kicker mb-4">today&rsquo;s ritual</p>
            <ol className="space-y-2.5">
              {STEPS.map((s, i) => {
                const state =
                  i < currentIndex ? "done" : i === currentIndex ? "current" : "pending";
                return (
                  <li
                    key={s.kind}
                    className={cn(
                      "flex items-center gap-3 text-sm transition-colors",
                      state === "current" && "text-foreground",
                      state === "done" && "text-foreground/55",
                      state === "pending" && "text-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full text-[11px] font-medium transition-all",
                        state === "current" &&
                          "glow-step bg-primary text-primary-foreground",
                        state === "done" && "bg-foreground/15 text-foreground/70",
                        state === "pending" && "border border-foreground/15"
                      )}
                    >
                      {state === "done" ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span>{s.label}</span>
                  </li>
                );
              })}
            </ol>
          </nav>

          {showJournal && (
            <div>
              <p className="kicker mb-4">what the agent picked</p>
              <ul className="space-y-4">
                {journal.gapFill && (
                  <JournalRow label="gap-fill" value={journal.gapFill.question} />
                )}
                {journal.archetype && (
                  <JournalRow label="archetype" value={journal.archetype.name} />
                )}
                {journal.probe && <JournalRow label="probe" value={journal.probe.question} />}
                {journal.interpret && (
                  <JournalRow label="frame" value={truncate(journal.interpret.quote, 64)} />
                )}
                {journal.takeaway && (
                  <JournalRow label="carry" value={journal.takeaway.question} />
                )}
              </ul>
            </div>
          )}

          {showHistoryLink && (
            <Link
              href="/history"
              className="mt-auto inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Clock className="h-4 w-4" />
              history
            </Link>
          )}
        </aside>

        {/* Stage */}
        <main className="relative flex h-full min-h-0 flex-col px-5 pb-6 pt-2 lg:px-12 lg:py-10">
          <StepBackdrop step={step} />
          <div className="relative z-10 mx-auto flex w-full max-w-[640px] flex-1 flex-col min-h-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function JournalRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/40">
        {label}
      </span>
      <span className="font-serif-italic text-[14px] leading-snug text-foreground/80">
        {value}
      </span>
    </li>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}
