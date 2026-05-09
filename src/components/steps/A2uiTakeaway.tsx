"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageProcessor } from "@a2ui/web_core/v0_9";
import { A2uiSurface, MarkdownContext, basicCatalog } from "@a2ui/react/v0_9";
import { renderMarkdown } from "@a2ui/markdown-it";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Download, Loader2, Moon, Share2, Sparkles } from "lucide-react";

/**
 * Step 6 — Takeaway, rendered via the A2UI protocol.
 *
 * The agent emits A2UI v0.9 messages describing a Column with two Text
 * children (question + evening line). We split that surface into two
 * sibling surfaces client-side so we can drop a <DreamImageCard /> between
 * them — the AI dream image gets to fade in temporally between the two
 * lines while a staggered reveal walks the user through them. By the time
 * the eye reaches the evening promise, gpt-image-1 has had ~10–15s of
 * head start, hiding the latency.
 *
 * Markdown is wired up via @a2ui/markdown-it so the agent's `variant: "h1"`
 * actually styles the question instead of leaking a literal `# ` prefix.
 */

type Msg = Record<string, unknown> & {
  version?: string;
  createSurface?: { surfaceId: string; catalogId: string };
  updateComponents?: {
    surfaceId: string;
    components: Array<Record<string, unknown> & { id?: string; children?: string[] }>;
  };
  updateDataModel?: { surfaceId: string; path?: string; value?: Record<string, unknown> };
};

type SplitSurfaces = {
  questionMessages: Msg[];
  eveningMessages: Msg[];
} | null;

function splitTakeawayMessages(messages: unknown[]): SplitSurfaces {
  const arr = messages as Msg[];
  const createMsg = arr.find((m) => m?.createSurface);
  const updateCompMsg = arr.find((m) => m?.updateComponents);
  const updateDataMsg = arr.find((m) => m?.updateDataModel);
  const catalogId = createMsg?.createSurface?.catalogId;
  const components = updateCompMsg?.updateComponents?.components;
  if (!catalogId || !components) return null;
  const root = components.find((c) => c.id === "root");
  const childIds = root?.children;
  if (!childIds || childIds.length < 2) return null;
  const [qId, eveningId] = childIds;
  const qComp = components.find((c) => c.id === qId);
  const eveningComp = components.find((c) => c.id === eveningId);
  if (!qComp || !eveningComp) return null;
  const data = updateDataMsg?.updateDataModel?.value ?? {};

  const buildSurface = (
    sid: string,
    childComp: Record<string, unknown>,
    childId: string
  ): Msg[] => [
    { version: "v0.9", createSurface: { surfaceId: sid, catalogId } },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId: sid,
        components: [
          { id: "root", component: "Column", children: [childId] },
          childComp,
        ],
      },
    } as Msg,
    {
      version: "v0.9",
      updateDataModel: { surfaceId: sid, path: "/", value: data },
    },
  ];

  return {
    questionMessages: buildSurface("takeaway-q", qComp, qId!),
    eveningMessages: buildSurface("takeaway-e", eveningComp, eveningId!),
  };
}

function useA2uiSurfaces(messages: Msg[] | null) {
  const processor = useMemo(() => {
    if (!messages) return null;
    const p = new MessageProcessor([basicCatalog]);
    try {
      // @ts-expect-error — A2UI message types are loose at the boundary
      p.processMessages(messages);
    } catch (err) {
      console.error("[a2ui] failed to process messages", err);
    }
    return p;
  }, [messages]);

  const [surfaces, setSurfaces] = useState(() =>
    processor ? Array.from(processor.model.surfacesMap.values()) : []
  );

  useEffect(() => {
    if (!processor) {
      setSurfaces([]);
      return;
    }
    setSurfaces(Array.from(processor.model.surfacesMap.values()));
    const sync = () =>
      setSurfaces(Array.from(processor.model.surfacesMap.values()));
    const sub1 = processor.onSurfaceCreated(sync);
    const sub2 = processor.onSurfaceDeleted(sync);
    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
    };
  }, [processor]);

  return surfaces;
}

export function A2uiTakeawayStep({
  messages,
  fallback,
  onSave,
  mode = "morning",
  sessionId,
  isAuthenticated = true,
  hasPendingSave = false,
  onSignUpAndSave,
}: {
  messages: unknown[];
  fallback?: { question: string; evening_line: string };
  onSave: () => void;
  mode?: "morning" | "evening";
  sessionId?: string | null;
  isAuthenticated?: boolean;
  hasPendingSave?: boolean;
  onSignUpAndSave?: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const split = useMemo(() => splitTakeawayMessages(messages), [messages]);
  const questionSurfaces = useA2uiSurfaces(split?.questionMessages ?? null);
  const eveningSurfaces = useA2uiSurfaces(split?.eveningMessages ?? null);
  const splitSucceeded = Boolean(split);

  // Image generation status — drives the in-screen DreamImageCard skeleton
  // and the wallpaper/share button loading states. Both feed off the same
  // /status endpoint so we only poll once.
  const [imageStatus, setImageStatus] = useState<
    "pending" | "ready" | "failed" | null
  >(null);

  useEffect(() => {
    if (sessionId && imageStatus === null) setImageStatus("pending");
  }, [sessionId, imageStatus]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/sessions/${sessionId}/status`);
        if (res.ok) {
          const { status } = (await res.json()) as { status: string | null };
          if (cancelled) return;
          if (status === "ready" || status === "failed") {
            setImageStatus(status);
            return;
          }
        }
      } catch {
        /* swallow transient errors; we'll retry */
      }
      if (attempts < 30 && !cancelled) setTimeout(tick, 2000);
    };
    setTimeout(tick, 2000);
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const downloadImage = async (variant: "portrait" | "square") => {
    const q = fallback?.question ?? "";
    const inlineUrl = `/api/takeaway-og/${variant}/inline?q=${encodeURIComponent(q)}`;
    const url = sessionId
      ? `/api/takeaway-og/${variant}/${sessionId}`
      : inlineUrl;
    const slug = sessionId ? sessionId.slice(0, 8) : "draft";
    if (
      variant === "square" &&
      typeof navigator !== "undefined" &&
      navigator.share
    ) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], `dreamflect-${slug}.png`, {
          type: "image/png",
        });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch {
        /* fall through to download */
      }
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = `dreamflect-${variant}-${slug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Buttons are gated until the image is in a terminal state — clicking
  // while still rendering would silently download the typography-only
  // fallback, which is confusing. If the save itself never landed (no
  // sessionId at all), we open the buttons immediately so the inline
  // typography-only OG path still works. 'failed' also re-enables.
  const shareReady =
    !sessionId || imageStatus === "ready" || imageStatus === "failed";
  const shareDisabled = !shareReady;

  return (
    <MarkdownContext.Provider value={renderMarkdown}>
      <div className="flex flex-1 min-h-0 flex-col gap-3 pt-2 sm:gap-4 sm:pt-3">
        <div className="text-center reveal-step" style={{ animationDelay: "0ms" }}>
          <p className="kicker">carry this into today &middot; rendered via A2UI</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {splitSucceeded ? (
            <div className="flex flex-col items-center gap-5 text-center">
              <div
                className="w-full reveal-step takeaway-q-surface"
                style={{ animationDelay: "300ms" }}
              >
                {questionSurfaces.map((s) => (
                  <A2uiSurface key={s.id} surface={s} />
                ))}
              </div>

              <div
                className="reveal-step"
                style={{ animationDelay: "1500ms" }}
              >
                <DreamImageCard
                  sessionId={sessionId}
                  imageStatus={imageStatus}
                />
              </div>

              <div
                className="w-full reveal-step takeaway-e-surface"
                style={{ animationDelay: "3200ms" }}
              >
                {eveningSurfaces.map((s) => (
                  <A2uiSurface key={s.id} surface={s} />
                ))}
              </div>
            </div>
          ) : (
            // Fallback if the agent's A2UI messages don't match the expected
            // shape — render the spec fields directly so we never blank out.
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="mb-4 h-5 w-5 text-primary" />
              <p
                className="font-serif-italic text-[24px] leading-[1.15] sm:text-[30px] lg:text-[36px] reveal-step"
                style={{ animationDelay: "200ms" }}
              >
                {fallback?.question ??
                  "where am I outmatched, but not actually stuck?"}
              </p>
              <div
                className="mt-5 reveal-step"
                style={{ animationDelay: "1400ms" }}
              >
                <DreamImageCard
                  sessionId={sessionId}
                  imageStatus={imageStatus}
                />
              </div>
              <p
                className="mt-5 max-w-md text-sm text-muted-foreground sm:text-base reveal-step"
                style={{ animationDelay: "3000ms" }}
              >
                {fallback?.evening_line ??
                  "we'll check in tonight — see if anything today rhymes."}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 reveal-step" style={{ animationDelay: "3800ms" }}>
          {!isAuthenticated && hasPendingSave && onSignUpAndSave ? (
            <SignUpGate
              fallbackQuestion={fallback?.question}
              onSignUpAndSave={onSignUpAndSave}
            />
          ) : (
            <Button onClick={onSave} size="lg">
              save &amp; close
            </Button>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="lg"
              disabled={shareDisabled}
              onClick={() => downloadImage("portrait")}
              className="sm:flex-1"
            >
              {shareReady ? (
                <Download className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {shareReady ? "wallpaper" : "rendering…"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={shareDisabled}
              onClick={() => downloadImage("square")}
              className="sm:flex-1"
            >
              {shareReady ? (
                <Share2 className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {shareReady ? "share" : "rendering…"}
            </Button>
          </div>
          {imageStatus === "pending" && sessionId && (
            <p className="text-center text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              your dream image is rendering…
            </p>
          )}
          {mode === "morning" && isAuthenticated && (
            <Link
              href="/reflect?mode=evening"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/30 px-5 py-2 text-sm text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground"
            >
              <Moon className="h-4 w-4" />
              preview evening reflection
            </Link>
          )}
        </div>
      </div>
    </MarkdownContext.Provider>
  );
}

/**
 * Square preview card for the gpt-image-1 dream image. Skeleton pulse
 * while pending, fade-in once /api/sessions/[id]/image returns 200,
 * collapses to nothing on failure (the typography-only share PNG still
 * works downstream — no need to surface a broken-image affordance).
 */
function DreamImageCard({
  sessionId,
  imageStatus,
}: {
  sessionId?: string | null;
  imageStatus: "pending" | "ready" | "failed" | null;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (imageStatus !== "ready") setLoaded(false);
  }, [imageStatus]);

  if (!sessionId || imageStatus === "failed") return null;

  return (
    <div className="dream-image-card relative aspect-square w-[68vw] max-w-64 overflow-hidden rounded-2xl border border-border/40 bg-card/30 shadow-[0_18px_50px_-22px_oklch(from_var(--primary)_l_c_h/0.55)]">
      {/* Skeleton pulse: stays visible until the <img> below loads */}
      <div
        aria-hidden
        className={`absolute inset-0 transition-opacity duration-700 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 25%, oklch(from var(--primary) l c h / 0.35), transparent 55%), radial-gradient(circle at 70% 75%, oklch(from var(--accent) l c h / 0.28), transparent 55%)",
        }}
      >
        <div className="dream-image-shimmer absolute inset-0" />
      </div>

      {imageStatus === "ready" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/sessions/${sessionId}/image`}
          alt="dream image"
          onLoad={() => setLoaded(true)}
          className={`relative h-full w-full object-cover transition-opacity duration-1000 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

/**
 * Inline sign-up gate shown on the takeaway when the user is anonymous.
 * The dream is held in DreamSession until this form succeeds — Better Auth
 * autoSignIn sets the cookie immediately, and onSignUpAndSave POSTs the
 * deferred payload so the dream + gpt-image-1 generation lights up. After
 * success we collapse to a minimal "saved" confirmation; the share buttons
 * below this card take over.
 */
function SignUpGate({
  fallbackQuestion,
  onSignUpAndSave,
}: {
  fallbackQuestion?: string;
  onSignUpAndSave: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
        <Check className="h-4 w-4 text-primary" />
        <span>your dream is saved.</span>
        <Link
          href="/history"
          className="ml-2 underline underline-offset-4 hover:text-primary"
        >
          history
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await onSignUpAndSave({ name, email, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2.5 rounded-2xl border border-border/60 bg-card/40 p-4"
    >
      <div className="flex flex-col gap-1">
        <p className="kicker">save this dream</p>
        <p className="text-sm text-muted-foreground">
          {fallbackQuestion
            ? "create an account to keep this question — and the dream image we're rendering."
            : "create an account to keep this dream and what comes after."}
        </p>
      </div>
      <Input
        type="text"
        autoComplete="name"
        placeholder="what should we call you? (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        type="email"
        autoComplete="email"
        placeholder="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        autoComplete="new-password"
        placeholder="password (8+ chars)"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "saving your dream…" : "save my dream"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        already have an account?{" "}
        <Link
          href="/signin"
          className="text-foreground underline underline-offset-4"
        >
          sign in
        </Link>
      </p>
    </form>
  );
}
