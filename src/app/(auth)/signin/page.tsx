"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { DreamflectMark } from "@/components/DreamflectMark";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "couldn't sign in");
      return;
    }
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
        <p className="kicker">welcome back</p>
        <h1 className="mt-3 font-serif-italic text-4xl leading-[1.05]">
          a private space
          <br /> for your dreams.
        </h1>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
          autoComplete="current-password"
          placeholder="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "signing in…" : "sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        no account yet?{" "}
        <Link href="/signup" className="text-foreground underline underline-offset-4">
          start your first dream
        </Link>
      </p>
    </div>
  );
}
