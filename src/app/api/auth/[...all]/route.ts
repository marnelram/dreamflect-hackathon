import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth requires Node runtime — pg Pool is not edge-compatible.
export const { GET, POST } = toNextJsHandler(auth.handler);
