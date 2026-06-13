import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAllSessions } from "@/lib/db";
import { DreamflectMark } from "@/components/DreamflectMark";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user?.id) redirect("/signin");

  const rows = await getAllSessions(session.user.id, 50);

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_30%_20%,oklch(from_var(--accent)_l_c_h/0.18)_0%,transparent_55%),radial-gradient(circle_at_70%_80%,oklch(from_var(--primary)_l_c_h/0.18)_0%,transparent_55%)]">
      <div className="mx-auto max-w-2xl px-6 py-12 lg:py-16">
        <header className="mb-12 flex items-center justify-between">
          <Link
            href="/reflect"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            today
          </Link>
          <div className="flex items-center gap-2">
            <DreamflectMark className="h-4 w-4 text-primary" />
            <span className="font-serif-italic text-xl">dreamflect</span>
          </div>
        </header>

        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="kicker">your dreams</p>
            <h1 className="mt-3 font-serif-italic text-4xl leading-[1.05] sm:text-5xl">
              what you&rsquo;ve carried.
            </h1>
          </div>
          {rows.length > 0 && (
            <a
              href="/api/sessions/export"
              download
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-2 text-sm text-muted-foreground backdrop-blur transition-colors hover:bg-card/60 hover:text-foreground"
            >
              <Download className="h-4 w-4" />
              export
            </a>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card/40 p-10 text-center backdrop-blur">
            <p className="font-serif-italic text-2xl text-foreground/80">
              your first dream will appear here.
            </p>
            <Link
              href="/reflect"
              className="mt-6 inline-block text-sm text-primary underline underline-offset-4"
            >
              start now
            </Link>
          </div>
        ) : (
          <ol className="space-y-4">
            {rows.map((row) => {
              const date = new Date(row.created_at);
              const dateLabel = date
                .toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
                .toLowerCase();
              const archetypeName = row.archetype?.name ?? "(unlabeled)";
              const takeawayQuestion = row.takeaway?.question ?? row.dream_text.slice(0, 80);
              const isEvening = row.kind === "evening";
              return (
                <li
                  key={row.id}
                  className="rounded-2xl border border-border bg-card/40 p-5 backdrop-blur transition-all hover:bg-card/60 sm:p-6"
                >
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <p className="kicker">
                      {dateLabel}
                      {isEvening && " · evening"}
                    </p>
                    <span className="font-serif-italic text-sm text-muted-foreground">
                      {archetypeName}
                    </span>
                  </div>
                  <p className="font-serif-italic text-lg leading-snug text-foreground sm:text-xl">
                    &ldquo;{takeawayQuestion}&rdquo;
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
