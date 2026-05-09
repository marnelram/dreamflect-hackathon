"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client. Provides:
 *  - useSession()      — reactive session hook
 *  - signIn.email()    — email+password sign in
 *  - signUp.email()    — email+password sign up
 *  - signOut()
 *
 * No baseURL set: defaults to same-origin, which is what we want.
 */
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
