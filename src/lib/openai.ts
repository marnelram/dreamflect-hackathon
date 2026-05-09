import OpenAI from "openai";

let client: OpenAI | null = null;

/** Singleton OpenAI client. Returns null if OPENAI_API_KEY is unset — callers should fallback gracefully. */
export function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}
