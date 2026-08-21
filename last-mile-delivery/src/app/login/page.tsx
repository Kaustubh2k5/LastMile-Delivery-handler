"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, setSession } from "@/lib/api-client";
import {
  AuthShell,
  AuthField,
  AuthForm,
  authInput,
  authBtn,
} from "@/components/auth-ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResendMsg("");
    setUnverifiedEmail(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(data.email || email);
          setError(data.error);
        } else {
          setError(data.error || "Login failed");
        }
        return;
      }
      setSession(data.token, data.user);
      if (data.user.role === "ADMIN") router.push("/admin");
      else if (data.user.role === "AGENT") router.push("/agent");
      else router.push("/customer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!unverifiedEmail) return;
    setResendMsg("");
    try {
      await api("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      setResendMsg("Verification email sent. Check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend");
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your verified LastMile account."
    >
      <AuthForm onSubmit={onSubmit}>
        <AuthField label="Email">
          <input
            className={authInput}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </AuthField>
        <AuthField label="Password">
          <input
            className={authInput}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </AuthField>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
            {unverifiedEmail && (
              <button
                type="button"
                onClick={resend}
                className="mt-2 block font-medium underline"
              >
                Resend verification email
              </button>
            )}
          </div>
        )}
        {resendMsg && (
          <p className="text-sm text-emerald-700">{resendMsg}</p>
        )}

        <button type="submit" className={authBtn} disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </AuthForm>

      <p className="text-center text-sm text-[var(--muted)]">
        New customer?{" "}
        <Link href="/register" className="font-medium text-[var(--accent)] underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
