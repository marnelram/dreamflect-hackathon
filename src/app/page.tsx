import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Dreamflect — we don't interpret your dreams. we help you interpret them yourself.",
  description:
    "A self-reflection app. Five minutes in the morning, an optional check-in at night. We ask the right questions until you realize what your dream is telling you.",
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
            <Link href="#how" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                How it works
              </Button>
            </Link>
            <Link href="/reflect">
              <Button variant="outline" size="sm">
                Begin
              </Button>
            </Link>
          </nav>
        </header>

        {/* Hero copy */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-6 sm:px-10">
          <div className="max-w-2xl">
            <span className="kicker">A self-reflection app for your dreams</span>
            <h1 className="mt-6 font-serif-italic text-5xl leading-[1.05] tracking-tight text-foreground sm:text-7xl">
              We don't interpret your dreams.
              <br />
              <span className="text-primary">We help you interpret them yourself.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-muted-foreground sm:text-xl">
              Dreams are your subconscious sending you messages. Most apps hand
              you a dictionary entry and call it a day. Dreamflect asks you the
              right questions — picked for the dream you actually had — until
              the meaning lands for <em>you</em>. The moment of self-recognition
              is the product.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/reflect">
                <Button size="lg">Reflect on a dream →</Button>
              </Link>
              <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">
                How a session works
              </a>
            </div>

            <p className="mt-12 text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
              Five minutes in the morning · An optional check-in at night
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Pitch ───────── */}
      <section id="how" className="relative mx-auto max-w-5xl px-6 py-24 sm:px-10 sm:py-32">
        <span className="kicker">The one big idea</span>
        <h2 className="mt-6 font-serif-italic text-4xl leading-tight tracking-tight sm:text-5xl">
          The opposite of a <em className="text-primary not-italic">dream dictionary</em>.
        </h2>
        <p className="mt-8 max-w-3xl text-lg text-muted-foreground">
          A dream about being chased might not <em>feel</em> like a chase dream.
          A school bus dream might be about belonging, not nostalgia. Dreams are
          messy and layered — and the meaning that matters is the one you
          arrive at yourself. Dreamflect doesn't decode for you. It asks
          questions that are tuned to the specific dream you had, then steps
          aside so you can react. The pushback, the "actually, it's more
          about…", is where the insight lives.
        </p>
      </section>

      {/* ───────── Steps ───────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        <div className="mb-10">
          <span className="kicker">A morning session, ~5 minutes</span>
          <h2 className="mt-4 font-serif-italic text-3xl leading-tight tracking-tight sm:text-4xl">
            Six steps — and not one of them tells you what your dream means.
          </h2>
        </div>
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

      {/* ───────── Two touchpoints ───────── */}
      <section className="mx-auto max-w-5xl px-6 pb-32 sm:px-10">
        <div className="rounded-3xl border border-border bg-card/40 p-8 sm:p-12">
          <span className="kicker">Two touchpoints, one rhythm</span>
          <h2 className="mt-4 font-serif-italic text-3xl leading-tight tracking-tight sm:text-4xl">
            The morning is the question.
            <br />
            <span className="text-primary">The evening is where it lands.</span>
          </h2>
          <p className="mt-6 max-w-3xl text-muted-foreground">
            Dreams process things already happening in waking life. So before
            bed, Dreamflect quietly asks: <em>this morning you reflected on a
            dream about [theme] — did anything today connect?</em> The odds are
            high that something did. That's the "oh wait" moment — and the
            place the deeper work actually happens. Over weeks, recurring
            patterns surface on their own.
          </p>
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
              Five minutes. One dream. Whatever you realize, you got there
              yourself.
            </p>
          </div>
          <Link href="/reflect">
            <Button size="lg">Begin →</Button>
          </Link>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-xs uppercase tracking-[0.2em] text-muted-foreground/60 sm:px-10">
            <span>dreamflect · 2026</span>
            <span>Self-reflection, not interpretation</span>
          </div>
        </div>
      </section>
    </main>
  );
}

const STEPS = [
  {
    title: "Capture",
    body: "Type or speak your dream while it's still fresh. The only writing you'll do all session.",
  },
  {
    title: "Gap-fill",
    body: "If you gave us specifics, we ask about feelings. If you gave us feelings, we ask for specifics. The missing half is where the meaning hides.",
  },
  {
    title: "Recognize",
    body: "We name the shape of the dream — chase, falling, hidden room, social disconnection. You confirm or push back. You're driving.",
  },
  {
    title: "Probe",
    body: "One question chosen for the shape of your dream. Agency for chases. Impact for falls. Audience for being-watched.",
  },
  {
    title: "Frame",
    body: "An interpretive frame, offered — not a verdict, declared. We ask whether it lands. Often the disagreement is where the real insight shows up.",
  },
  {
    title: "Takeaway",
    body: "One short, portable question to carry into the day. Tonight, we'll quietly ask whether anything rhymed.",
  },
];
