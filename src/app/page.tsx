import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Dreamflect — type your dream, the agent renders the rest",
  description:
    "A 6-step morning ritual where Claude builds every screen at runtime — picked from your specific dream. No chat. Just generative UI.",
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* ───────── Hero ───────── */}
      <section className="relative isolate flex min-h-[100vh] flex-col">
        {/* Background image */}
        <Image
          src="/landing-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Left-to-right wash so copy reads on the left half */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />
        {/* Subtle bottom fade into the next section */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />

        {/* Top bar */}
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
          <span className="font-serif-italic text-2xl tracking-tight text-foreground">
            dreamflect
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/reflect" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Try the demo
              </Button>
            </Link>
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm">
                Hackathon submission
              </Button>
            </a>
          </nav>
        </header>

        {/* Hero copy */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-6 sm:px-10">
          <div className="max-w-2xl">
            <span className="kicker">Generative UI Hackathon · 2026</span>
            <h1 className="mt-6 font-serif-italic text-5xl leading-[1.05] tracking-tight text-foreground sm:text-7xl">
              Type your dream.
              <br />
              <span className="text-primary">The agent renders the rest.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-muted-foreground sm:text-xl">
              A six-step morning ritual where every screen after the first is
              chosen — and built — at runtime by Claude. Not a chat. Not a form.
              A surface that couldn't exist as a static component, because it's
              picked from <em>your</em> dream.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/reflect">
                <Button size="lg">Reflect on a dream →</Button>
              </Link>
              <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">
                How it works
              </a>
            </div>

            <p className="mt-12 text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
              Built with CopilotKit · A2UI · Claude Opus 4.7
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Pitch ───────── */}
      <section id="how" className="relative mx-auto max-w-5xl px-6 py-24 sm:px-10 sm:py-32">
        <span className="kicker">The one big idea</span>
        <h2 className="mt-6 font-serif-italic text-4xl leading-tight tracking-tight sm:text-5xl">
          The agent doesn't <em className="text-primary not-italic">talk</em>.
          <br />
          It <em className="text-primary not-italic">renders</em>.
        </h2>
        <p className="mt-8 max-w-3xl text-lg text-muted-foreground">
          Most AI products bolt a chat box onto the side of an app. Dreamflect
          flips it: you type one thing — your dream — and Claude calls a
          frontend tool for every screen that follows. The gap-fill question,
          the archetype, the probe, the interpretation, the takeaway. All
          chosen for the dream you typed.
        </p>
      </section>

      {/* ───────── Steps ───────── */}
      <section className="mx-auto max-w-6xl px-6 pb-32 sm:px-10">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="flex flex-col gap-3 bg-card p-8 transition-colors hover:bg-secondary"
            >
              <span className="kicker">Step {i + 1}</span>
              <h3 className="font-serif-italic text-2xl leading-tight tracking-tight">
                {s.title}
              </h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-8 px-6 py-24 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <h3 className="font-serif-italic text-3xl tracking-tight sm:text-4xl">
              Tell it about last night.
            </h3>
            <p className="mt-2 text-muted-foreground">
              Six minutes. One dream. Six screens you've never seen before.
            </p>
          </div>
          <Link href="/reflect">
            <Button size="lg">Begin the ritual →</Button>
          </Link>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-xs uppercase tracking-[0.2em] text-muted-foreground/60 sm:px-10">
            <span>dreamflect · 2026</span>
            <span>For the Generative UI Global Hackathon</span>
          </div>
        </div>
      </section>
    </main>
  );
}

const STEPS = [
  {
    title: "Capture",
    body: "You type your dream — once. The only text you'll write all session.",
  },
  {
    title: "Gap-fill",
    body: "Claude spots a missing detail and renders the exact question that unlocks the rest.",
  },
  {
    title: "Archetype",
    body: "The dream is matched to a symbol — chase, falling, doorway — and a screen forms around it.",
  },
  {
    title: "Probe",
    body: "A second-order question, picked for the archetype. Agency for chases. Witness for falls.",
  },
  {
    title: "Interpret",
    body: "Claude composes an interpretation surface from your specific answers — not a template.",
  },
  {
    title: "Takeaway",
    body: "A single thing to carry into the day, rendered as a quiet A2UI surface.",
  },
];
