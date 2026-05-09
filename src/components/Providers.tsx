"use client";

import { CopilotKitProvider } from "@copilotkit/react-core/v2";

export type Mode = "morning" | "evening";

export function Providers({
  children,
  mode = "morning",
}: {
  children: React.ReactNode;
  mode?: Mode;
}) {
  // The mode is encoded in the runtimeUrl so the server-side route can build
  // a different system prompt (skipping gap-fill/archetype/probe in evening).
  // Key forces a fresh CopilotKit context when mode flips, clearing any
  // in-flight messages from the previous mode.
  const runtimeUrl = mode === "evening" ? "/api/copilotkit?mode=evening" : "/api/copilotkit";
  return (
    <CopilotKitProvider
      key={mode}
      runtimeUrl={runtimeUrl}
      agent="default"
      useSingleEndpoint={true}
    >
      {children}
    </CopilotKitProvider>
  );
}
