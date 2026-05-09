"use client";

import { useState } from "react";
import { Mic, Pencil, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { playBloom, playChime, playFall } from "@/lib/sfx";

type Mode = "prompt" | "listen" | "transcribing" | "type";

function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function CaptureStep({
  onSubmit,
  isLoading,
}: {
  onSubmit: (dream: string) => void;
  isLoading: boolean;
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("prompt");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recorder = useAudioRecorder();

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  async function startRecording() {
    setVoiceError(null);
    if (!recorder.supported) {
      setMode("type");
      return;
    }
    const ok = await recorder.start();
    if (ok) {
      playBloom();
      setMode("listen");
    } else {
      setVoiceError(recorder.error ?? "couldn't access microphone");
      setMode("type");
    }
  }

  async function stopAndTranscribe() {
    playFall();
    setMode("transcribing");
    const blob = await recorder.stop();
    if (!blob) {
      setMode("type");
      return;
    }
    try {
      // Match the filename extension to the actual blob mime so Whisper's
      // format detection doesn't trip over an mp4-in-a-.webm-named-file.
      const ext = blob.type.includes("mp4")
        ? "mp4"
        : blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      const form = new FormData();
      form.append("audio", blob, `dream.${ext}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setVoiceError(body.error ?? "transcription failed");
        setMode("type");
        return;
      }
      const { text: transcribed } = (await res.json()) as { text: string };
      setText(transcribed.trim());
      setMode("type");
    } catch (err) {
      console.error("[capture] transcribe error", err);
      setVoiceError("transcription failed — type your dream instead");
      setMode("type");
    }
  }

  if (mode === "prompt") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
        <p className="kicker lg:hidden">tue &middot; apr 17 &middot; morning</p>
        <h1 className="font-serif-italic text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
          tell me what
          <br /> you dreamed.
        </h1>
        <div className="relative grid h-55 w-55 place-items-center sm:h-65 sm:w-65">
          <span
            aria-hidden
            className="glow-halo pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,oklch(from_var(--primary)_l_c_h/0.25)_0%,transparent_70%)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-7 rounded-full border border-foreground/15"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-12 rounded-full border border-dashed border-foreground/12"
          />
          <button
            type="button"
            aria-label="Tap to speak your dream"
            onClick={startRecording}
            className="glow-mic grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground transition active:scale-95 hover:brightness-110 sm:h-28 sm:w-28"
          >
            <Mic strokeWidth={1.6} className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {recorder.supported ? "tap to speak" : "voice not supported here"}
          <br />
          or{" "}
          <button
            className="underline underline-offset-4 cursor-pointer"
            onClick={() => {
              playChime();
              setMode("type");
            }}
          >
            write instead
          </button>
        </p>
      </div>
    );
  }

  if (mode === "listen") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
        <p className="kicker">listening</p>
        <h1 className="font-serif-italic text-3xl leading-[1.05] sm:text-4xl">
          tell me what
          <br /> you dreamed.
        </h1>
        <div className="relative grid h-55 w-55 place-items-center sm:h-65 sm:w-65">
          {/* Pulsing rings while recording */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-primary/30"
            style={{ animationDuration: "2s" }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-4 animate-ping rounded-full bg-primary/20"
            style={{ animationDuration: "2.5s", animationDelay: "0.3s" }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,oklch(from_var(--primary)_l_c_h/0.35)_0%,transparent_70%)]"
          />
          <button
            type="button"
            aria-label="Stop recording"
            onClick={stopAndTranscribe}
            className="relative grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_40px_oklch(from_var(--primary)_l_c_h/0.5)] transition active:scale-95 hover:brightness-110 sm:h-28 sm:w-28"
          >
            <Square fill="currentColor" className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>
        </div>
        <p className="font-mono text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
          {formatElapsed(recorder.elapsedSec)} &middot; tap to stop
        </p>
      </div>
    );
  }

  if (mode === "transcribing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <p className="kicker">transcribing</p>
        <h1 className="font-serif-italic text-3xl leading-[1.05] sm:text-4xl">
          let me listen to
          <br /> what you said…
        </h1>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // type mode
  return (
    <div className="flex flex-1 flex-col gap-6 pt-4 sm:pt-8">
      <p className="kicker text-center lg:hidden">tue &middot; apr 17 &middot; morning</p>
      <h1 className="text-center font-serif-italic text-3xl leading-[1.05] sm:text-4xl lg:text-5xl">
        what did you
        <br /> dream?
      </h1>
      {voiceError && (
        <p className="text-center text-xs text-destructive">{voiceError}</p>
      )}
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="I was on a rope bridge, high up in a steampunk sky…"
        className="min-h-45 flex-1 sm:min-h-60"
      />
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {wordCount} words &middot; still listening
      </p>
      {recorder.supported && (
        <button
          type="button"
          onClick={() => {
            setText("");
            setVoiceError(null);
            setMode("prompt");
          }}
          className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
        >
          <Mic className="h-3.5 w-3.5" />
          rerecord
        </button>
      )}
      <Button
        disabled={!text.trim() || isLoading}
        onClick={() => onSubmit(text.trim())}
        size="lg"
      >
        {isLoading ? "reading…" : "share with the agent"}
        {!isLoading && <Pencil className="h-4 w-4" />}
      </Button>
    </div>
  );
}
