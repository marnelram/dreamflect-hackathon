"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "requesting" | "recording" | "stopping";

export function useAudioRecorder() {
  const [status, setStatus] = useState<Status>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Default to `null` (= still detecting). Capture treats null/false as "not yet"
  // and does NOT short-circuit the click — see startRecording().
  const [supported, setSupported] = useState<boolean | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect support after mount — avoids SSR/hydration mismatch where the
  // server can't see `window.MediaRecorder` and renders the disabled state.
  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== "undefined";
    setSupported(ok);
    if (!ok && typeof window !== "undefined") {
      console.warn("[recorder] MediaRecorder unsupported", {
        hasWindow: typeof window !== "undefined",
        hasNavigator: typeof navigator !== "undefined",
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
        hasMediaRecorder: typeof window.MediaRecorder,
      });
    }
  }, []);

  const stopTicking = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopTicking();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, [stopTicking]);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    // Re-check support live at click-time (avoids stale state).
    const liveSupported =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== "undefined";
    if (!liveSupported) {
      setError("voice not supported in this browser");
      console.warn("[recorder] start blocked — unsupported");
      return false;
    }
    setError(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Pick the first supported mime type — Brave/Safari sometimes don't accept audio/webm.
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mimeType =
        candidates.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = mr;
      mr.start();
      startTimeRef.current = Date.now();
      setElapsedSec(0);
      tickRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 250);
      setStatus("recording");
      return true;
    } catch (err) {
      console.error("[recorder] start failed", err);
      setError(err instanceof Error ? err.message : "couldn't access microphone");
      setStatus("idle");
      cleanup();
      return false;
    }
  }, [supported, cleanup]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mr = recorderRef.current;
      if (!mr || mr.state === "inactive") {
        cleanup();
        setStatus("idle");
        resolve(null);
        return;
      }
      setStatus("stopping");
      stopTicking();
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        cleanup();
        setStatus("idle");
        resolve(blob);
      };
      mr.stop();
    });
  }, [cleanup, stopTicking]);

  return {
    // null while detecting; treat null as "yes, optimistically" so the UI
    // doesn't flash "voice not supported" before the useEffect runs.
    supported: supported !== false,
    status,
    recording: status === "recording",
    elapsedSec,
    error,
    start,
    stop,
  };
}
