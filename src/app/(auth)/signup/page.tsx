"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";
import { DreamflectMark } from "@/components/DreamflectMark";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signUp.email({ name: name || email.split("@")[0], email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "couldn't sign up");
      return;
    }
    // autoSignIn is enabled in auth.ts so we're already in.
    router.push("/reflect");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center gap-2">
        <DreamflectMark className="h-4 w-4 text-primary" />
        <span className="font-serif-italic text-2xl">dreamflect</span>
      </div>

      <div>
        <p className="kicker">begin</p>
        <h1 className="mt-3 font-serif-italic text-4xl leading-[1.05]">
          your morning
          <br /> ritual starts here.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          we keep your dreams private. the agent reads them only to help you
          read them yourself.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
          {loading ? "creating your space…" : "create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        already have an account?{" "}
        <Link href="/signin" className="text-foreground underline underline-offset-4">
          sign in
        </Link>
      </p>
    </div>
  );
}
