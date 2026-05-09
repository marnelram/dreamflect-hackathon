"use client";

import { useCallback, useRef, useState } from "react";
import { useFrontendTool, useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { z } from "zod";

const randomUUID = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
import { SessionShell } from "@/components/SessionShell";
import { CaptureStep } from "@/components/steps/Capture";
import { GapFillStep } from "@/components/steps/GapFill";
import { SensitivityCheckStep } from "@/components/steps/SensitivityCheck";
import { ArchetypeStep } from "@/components/steps/Archetype";
import { ProbeStep } from "@/components/steps/Probe";
import { InterpretStep } from "@/components/steps/Interpret";
import { A2uiTakeawayStep } from "@/components/steps/A2uiTakeaway";
import { LoadingStep } from "@/components/steps/Loading";
import { basicCatalog } from "@a2ui/react/v0_9";
import { playReveal, playTransition } from "@/lib/sfx";
import { signUp, useSession } from "@/lib/auth-client";
import type {
  GapFillSpec,
  ArchetypeSpec,
  ProbeSpec,
  InterpretSpec,
  TakeawaySpec,
  SensitivityFlagSpec,
  StepKind,
} from "@/lib/types";

type SaveSessionPayload = {
  kind: "morning" | "evening";
  dream_text: string;
  gap_fill: (GapFillSpec & { answer: string | null }) | null;
  archetype: ArchetypeSpec | null;
  probe: (ProbeSpec & { answer: string | null }) | null;
  interpret: InterpretSpec | null;
  takeaway: TakeawaySpec;
  resonance: string | null;
};

/**
 * The agent (Claude via CopilotKit's BuiltInAgent) renders this entire
 * experience by calling frontend tools. The user types one thing — their
 * dream — and from then on the agent picks WHAT to ask, WHAT to label,
 * WHAT to interpret. The UI is a window into those tool calls.
 *
 * Each useFrontendTool below registers a schema with the agent. When the
 * agent fires it, we capture the args into local state and swap the
 * phone-frame's contents to the matching component. The render() return
 * value is intentionally null — we render the cards ourselves inside the
 * phone frame, not inline in a chat thread.
 */
export function DreamSession({
  mode = "morning",
}: {
  mode?: "morning" | "evening";
}) {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  // Better Auth's reactive session — we need to know if the user is signed
  // in so we can defer the POST /api/sessions save until after sign-up.
  const { data: authSession, isPending: authPending } = useSession();
  const isAuthenticated = Boolean(authSession?.user?.id);

  const [step, setStep] = useState<StepKind>("capture");
  // What the agent is currently working toward — set when the user takes
  // an action, cleared when the matching tool fires. Drives <LoadingStep>.
  const [awaitingStep, setAwaitingStep] = useState<Exclude<StepKind, "capture"> | null>(null);
  const [gapFillSpec, setGapFillSpec] = useState<GapFillSpec | null>(null);
  const [sensitivityFlagSpec, setSensitivityFlagSpec] = useState<SensitivityFlagSpec | null>(null);
  const [archetypeSpec, setArchetypeSpec] = useState<ArchetypeSpec | null>(null);
  const [probeSpec, setProbeSpec] = useState<ProbeSpec | null>(null);
  const [interpretSpec, setInterpretSpec] = useState<InterpretSpec | null>(null);
  const [takeawaySpec, setTakeawaySpec] = useState<TakeawaySpec | null>(null);

  // Captured at submit time for the save-payload — the agent's message
  // history has these too, but pulling them out cleanly is awkward.
  const [dreamText, setDreamText] = useState("");
  const [gapFillAnswer, setGapFillAnswer] = useState<string | null>(null);
  const [probeAnswer, setProbeAnswer] = useState<string | null>(null);
  const [resonance, setResonance] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Dedupe — render() fires multiple times per tool call as status transitions.
  // We only want to commit args ONCE per tool invocation.
  const seenArgs = useRef(new Set<string>());

  // Refs hold the most recent values so the takeaway-save callback (fired
  // synchronously inside commitOnce) sees the right snapshot without us
  // adding them all to a useEffect dependency array.
  const dreamTextRef = useRef("");
  const gapFillSpecRef = useRef<GapFillSpec | null>(null);
  const sensitivityFlagSpecRef = useRef<SensitivityFlagSpec | null>(null);
  const archetypeSpecRef = useRef<ArchetypeSpec | null>(null);
  const probeSpecRef = useRef<ProbeSpec | null>(null);
  const interpretSpecRef = useRef<InterpretSpec | null>(null);
  const gapFillAnswerRef = useRef<string | null>(null);
  const probeAnswerRef = useRef<string | null>(null);
  const resonanceRef = useRef<string | null>(null);

  const commitOnce = useCallback(<T,>(key: string, args: T, fn: (args: T) => void) => {
    const k = `${key}::${JSON.stringify(args)}`;
    if (seenArgs.current.has(k)) return;
    seenArgs.current.add(k);
    fn(args);
  }, []);

  // Held while the user is anonymous on the takeaway screen — the POST is
  // deferred until they sign up via the inline form on the takeaway. Once
  // the form succeeds we POST this exact payload, then clear it.
  const pendingSavePayloadRef = useRef<SaveSessionPayload | null>(null);
  const [hasPendingSave, setHasPendingSave] = useState(false);

  const persistSession = useCallback(
    async (payload: SaveSessionPayload) => {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const { id } = (await res.json()) as { id: string };
          setSessionId(id);
        } else {
          console.error("[dreamflect] save failed", await res.text());
        }
      } catch (err) {
        console.error("[dreamflect] save error", err);
      }
    },
    []
  );

  // Step 1.5 — Sensitivity gate (only fires if the dream contains heavy content)
  useFrontendTool({
    name: "flag_sensitive_content",
    description:
      "Call BEFORE propose_gap_fill if the dream contains trauma replay, grief/visitation, suicidal ideation, abuse imagery, or acute distress cues. The user sees a brief acknowledgment and a single 'continue gently' button. After they tap continue, proceed with the normal flow but in gentle mode (validation-first, no symbolic decoding).",
    parameters: z.object({
      category: z
        .enum(["trauma_replay", "grief_visitation", "ideation", "abuse", "acute_distress"])
        .describe("Which sensitivity bucket this dream falls into"),
      acknowledgment: z
        .string()
        .describe(
          "One short sentence in second person. Validating, not clinical. Lowercase. e.g. 'this one carries weight. let's go gently.'"
        ),
      continue_label: z
        .string()
        .describe("Button label, lowercase, e.g. 'continue gently'"),
    }),
    handler: async (args) => {
      const spec = args as SensitivityFlagSpec;
      sensitivityFlagSpecRef.current = spec;
      setSensitivityFlagSpec(spec);
      setStep("sensitivity-check");
      setAwaitingStep(null);
      playTransition();
      return "ok";
    },
  });

  // Step 2 — Gap-fill
  useFrontendTool({
    name: "propose_gap_fill",
    description:
      "Ask the user one short, intimate question about what was missing in their telling — usually emotional texture or a specific detail. Provide 3-4 chip options. Phrase like 'how did that feel, really?'",
    parameters: z.object({
      kicker: z.string().describe("Short eyebrow text e.g. 'one question'"),
      question: z.string().describe("The question itself, lowercase, intimate"),
      body: z.string().describe("One-line context / softening, lowercase"),
      chips: z
        .array(z.string())
        .min(3)
        .max(4)
        .describe("3-4 chip-shaped answer options including a 'something else…' escape"),
      why: z
        .string()
        .describe("One sentence: why YOU chose this question. For your own reasoning, not shown."),
    }),
    handler: async (args) => {
      const spec = args as GapFillSpec;
      gapFillSpecRef.current = spec;
      setGapFillSpec(spec);
      setStep("gap-fill");
      setAwaitingStep(null);
      playTransition();
      return "ok";
    },
  });

  // Step 3 — Archetype
  useFrontendTool({
    name: "propose_archetype",
    description:
      "Name the dream archetype based on the dream + the gap-fill answer. Lowercase 2-3 word name, short category tag, single one-line description.",
    parameters: z.object({
      category: z.string().describe("e.g. 'physical · spatial', 'interpersonal · liminal'"),
      name: z.string().describe("2-3 word lowercase archetype name"),
      description: z.string().describe("One-line description of the underlying pattern"),
      secondary_tag: z
        .string()
        .optional()
        .describe("Optional faint secondary archetype, e.g. '+ flying (trace)'"),
    }),
    handler: async (args) => {
      const spec = args as ArchetypeSpec;
      archetypeSpecRef.current = spec;
      setArchetypeSpec(spec);
      setStep("archetype");
      setAwaitingStep(null);
      playTransition();
      return "ok";
    },
  });

  // Step 4 — Probe
  useFrontendTool({
    name: "propose_probe",
    description:
      "First name the dream's central image (the most powerful image, e.g. 'the tidal wave', 'the locked door') as central_image. Then ask what feeling that image pictures, using the archetype-specific axis: chase→agency, falling→impact/witness, flying→control, lost→searching/surrendering, test→preparation/ambush. Three options including 'both, at different points'.",
    parameters: z.object({
      kicker: z.string().describe("e.g. 'the unlock-question'"),
      central_image: z
        .string()
        .describe(
          "The single most powerful image from the dream, named in 2-5 words with a definite article. e.g. 'the tidal wave', 'the locked door', 'the endless stairs'. The question pivots on this."
        )
        .optional(),
      question: z
        .string()
        .describe("The probe, second person, present tense. Pivot it on the central_image."),
      options: z.array(z.string()).min(3).max(3).describe("Exactly 3 options"),
    }),
    handler: async (args) => {
      const spec = args as ProbeSpec;
      probeSpecRef.current = spec;
      setProbeSpec(spec);
      setStep("probe");
      setAwaitingStep(null);
      playTransition();
      return "ok";
    },
  });

  // Step 5 — Interpret
  useFrontendTool({
    name: "propose_interpretation",
    description:
      "Offer a frame, not a verdict. Quote-style, second person. ~30 word quote, ~20 word expansion. The user can disagree — be useful, not right.",
    parameters: z.object({
      kicker: z.string().describe("e.g. 'try this on'"),
      quote: z.string().describe("The interpretation, ~30 words, second person, italic-worthy"),
      expansion: z.string().describe("A second sentence, ~20 words, slightly softer"),
    }),
    handler: async (args) => {
      const spec = args as InterpretSpec;
      interpretSpecRef.current = spec;
      setInterpretSpec(spec);
      setStep("interpret");
      setAwaitingStep(null);
      playTransition();
      return "ok";
    },
  });

  // Step 6 — Takeaway, rendered via A2UI
  useFrontendTool({
    name: "emit_takeaway",
    description:
      "Distill the session into ONE portable QUESTION (not an answer) the user carries through the day, plus an evening promise line. ALSO emit a tiny A2UI v0.9 surface in 'a2ui_messages' (Column with two Text nodes) so the takeaway is rendered via the A2UI protocol. Use the literal string '<basicCatalog.id>' for catalogId — the client substitutes the real catalog ID.",
    parameters: z.object({
      kicker: z.string().describe("e.g. 'carry this into today'"),
      question: z.string().describe("One portable question — 8-12 words, lowercase"),
      evening_line: z.string().describe("'we'll check in tonight…'-style promise"),
      a2ui_messages: z
        .array(z.unknown())
        .describe(
          "JSONL array of A2UI v0.9 messages: createSurface, updateComponents, updateDataModel."
        ),
    }),
    handler: async (args) => {
      const spec = args as TakeawaySpec;
      setTakeawaySpec(spec);
      setStep("takeaway");
      setAwaitingStep(null);
      playReveal();
      // Build the save payload from the snapshotted refs.
      const payload: SaveSessionPayload = {
        kind: mode,
        dream_text: dreamTextRef.current,
        gap_fill: gapFillSpecRef.current
          ? { ...gapFillSpecRef.current, answer: gapFillAnswerRef.current }
          : null,
        archetype: archetypeSpecRef.current,
        probe: probeSpecRef.current
          ? { ...probeSpecRef.current, answer: probeAnswerRef.current }
          : null,
        interpret: interpretSpecRef.current,
        takeaway: spec,
        resonance: resonanceRef.current,
      };
      // Authenticated → fire-and-forget save. Anonymous → hold the payload
      // until the inline sign-up form on the takeaway succeeds.
      if (isAuthenticated) {
        void persistSession(payload);
      } else {
        pendingSavePayloadRef.current = payload;
        setHasPendingSave(true);
      }
      return "ok";
    },
  });

  /** Add a user message and run the agent.
   *
   * runAgent occasionally throws a SyntaxError when the model's streamed
   * tool-call args get truncated mid-string and the partial JSON fails to
   * parse. These are transient (SSE blip), so we retry up to 3 times with
   * a small backoff. On final failure we clear awaitingStep so the user
   * isn't stranded on the loading screen — they bounce back to the step
   * they were on and can re-submit. */
  const sendUserMessage = useCallback(
    async (content: string) => {
      agent.addMessage({ id: randomUUID(), role: "user", content });
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await copilotkit.runAgent({ agent });
          return;
        } catch (err) {
          const retryable = err instanceof SyntaxError;
          if (retryable && attempt < maxAttempts) {
            console.warn("[dreamflect] runAgent JSON parse failed, retrying", { attempt, err });
            await new Promise((r) => setTimeout(r, 300 * attempt));
            continue;
          }
          console.error("[dreamflect] runAgent failed, reverting", { attempt, err });
          setAwaitingStep(null);
          return;
        }
      }
    },
    [agent, copilotkit]
  );

  const onCaptureSubmit = (dream: string) => {
    setDreamText(dream);
    dreamTextRef.current = dream;
    setAwaitingStep(mode === "evening" ? "interpret" : "gap-fill");
    void sendUserMessage(`Here is my dream:\n\n${dream}`);
  };

  const onSensitivityContinue = () => {
    setAwaitingStep("gap-fill");
    void sendUserMessage(
      `User chose to continue gently. Proceed with the normal flow (gap-fill → archetype → probe → interpret → takeaway), staying in gentle mode per the SAFETY rules.`
    );
  };

  const onGapFillAnswer = (answer: string) => {
    setGapFillAnswer(answer);
    gapFillAnswerRef.current = answer;
    setAwaitingStep("archetype");
    void sendUserMessage(`Gap-fill answer: ${answer}`);
  };

  const onArchetypeConfirm = (confirmed: boolean) => {
    setAwaitingStep(confirmed ? "probe" : "archetype");
    void sendUserMessage(
      confirmed
        ? `That archetype lands. Move on.`
        : `That's not quite it. Suggest a different archetype.`
    );
  };

  const onProbeAnswer = (answer: string) => {
    setProbeAnswer(answer);
    probeAnswerRef.current = answer;
    setAwaitingStep("interpret");
    void sendUserMessage(`Probe answer: ${answer}`);
  };

  const onResonance = (label: string) => {
    setResonance(label);
    resonanceRef.current = label;
    setAwaitingStep("takeaway");
    void sendUserMessage(
      `Resonance: ${label}. Now emit the takeaway via the emit_takeaway tool, including A2UI messages.`
    );
  };

  const onSaveAndClose = () => {
    setStep("capture");
    setAwaitingStep(null);
    setGapFillSpec(null);
    setSensitivityFlagSpec(null);
    setArchetypeSpec(null);
    setProbeSpec(null);
    setInterpretSpec(null);
    setTakeawaySpec(null);
    setDreamText("");
    setGapFillAnswer(null);
    setProbeAnswer(null);
    setResonance(null);
    setSessionId(null);
    dreamTextRef.current = "";
    gapFillSpecRef.current = null;
    sensitivityFlagSpecRef.current = null;
    archetypeSpecRef.current = null;
    probeSpecRef.current = null;
    interpretSpecRef.current = null;
    gapFillAnswerRef.current = null;
    probeAnswerRef.current = null;
    resonanceRef.current = null;
    pendingSavePayloadRef.current = null;
    setHasPendingSave(false);
    seenArgs.current.clear();
  };

  // Inline sign-up flow on the takeaway. The dream payload was held back
  // when the takeaway emitted; once Better Auth completes sign-up (with
  // autoSignIn the cookie is set immediately) we POST the held payload so
  // the dream lands in the user's history and gpt-image-1 kicks off.
  const onSignUpAndSave = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const payload = pendingSavePayloadRef.current;
      if (!payload) {
        return { ok: false as const, error: "no dream to save" };
      }
      const { error } = await signUp.email({
        name: input.name || input.email.split("@")[0] || "dreamer",
        email: input.email,
        password: input.password,
      });
      if (error) {
        return { ok: false as const, error: error.message ?? "couldn't sign up" };
      }
      pendingSavePayloadRef.current = null;
      setHasPendingSave(false);
      await persistSession(payload);
      return { ok: true as const };
    },
    [persistSession]
  );

  // Substitute the real basicCatalog id where the agent put '<basicCatalog.id>'
  const a2uiMessages = takeawaySpec?.a2ui_messages
    ? JSON.parse(
        JSON.stringify(takeawaySpec.a2ui_messages).replaceAll(
          "<basicCatalog.id>",
          basicCatalog.id
        )
      )
    : [];

  return (
    <SessionShell
      step={step}
      isAuthenticated={isAuthenticated}
      authPending={authPending}
      journal={{
        gapFill: gapFillSpec,
        archetype: archetypeSpec,
        probe: probeSpec,
        interpret: interpretSpec,
        takeaway: takeawaySpec,
      }}
    >
      {/* awaitingStep takes precedence — show the loading screen while the
          agent decides what UI to render next. */}
      {awaitingStep ? (
        <LoadingStep awaiting={awaitingStep} />
      ) : (
        <>
          {step === "capture" && (
            <CaptureStep onSubmit={onCaptureSubmit} isLoading={agent.isRunning} />
          )}
          {step === "gap-fill" && gapFillSpec && (
            <GapFillStep spec={gapFillSpec} onAnswer={onGapFillAnswer} />
          )}
          {step === "sensitivity-check" && sensitivityFlagSpec && (
            <SensitivityCheckStep
              spec={sensitivityFlagSpec}
              onContinue={onSensitivityContinue}
            />
          )}
          {step === "archetype" && archetypeSpec && (
            <ArchetypeStep spec={archetypeSpec} onConfirm={onArchetypeConfirm} />
          )}
          {step === "probe" && probeSpec && (
            <ProbeStep spec={probeSpec} onAnswer={onProbeAnswer} />
          )}
          {step === "interpret" && interpretSpec && (
            <InterpretStep spec={interpretSpec} onResonance={onResonance} />
          )}
          {step === "takeaway" && takeawaySpec && (
            <A2uiTakeawayStep
              messages={a2uiMessages}
              fallback={{
                question: takeawaySpec.question,
                evening_line: takeawaySpec.evening_line,
              }}
              onSave={onSaveAndClose}
              mode={mode}
              sessionId={sessionId}
              isAuthenticated={isAuthenticated}
              hasPendingSave={hasPendingSave}
              onSignUpAndSave={onSignUpAndSave}
            />
          )}
        </>
      )}
    </SessionShell>
  );
}
