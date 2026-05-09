import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getLatestMorning, getPriorSessions } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/system-prompt";

/**
 * CopilotKit v2 single-endpoint runtime. Multi-route catch-all (`[...path]`)
 * was unstable under Next.js Fast Refresh, so we run in single-route mode
 * — all client operations multiplex through this one POST endpoint, which
 * survives HMR cleanly. Provider must set useSingleEndpoint={true}.
 */
const handle = async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  const userName = session?.user?.name ?? null;

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "evening" ? "evening" : "morning";

  const [priorSessions, latestMorning] = userId
    ? await Promise.all([
        getPriorSessions(userId, 5),
        mode === "evening" ? getLatestMorning(userId) : Promise.resolve(null),
      ])
    : [[], null];

  const prompt = buildSystemPrompt({ mode, priorSessions, latestMorning, userName });

  const agent = new BuiltInAgent({
    model: "anthropic:claude-opus-4-7",
    prompt,
  });
  const runtime = new CopilotRuntime({ agents: { default: agent } });
  const handler = createCopilotRuntimeHandler({
    runtime,
    basePath: "/api/copilotkit",
    mode: "single-route",
  });
  return handler(req);
};

export { handle as POST };
