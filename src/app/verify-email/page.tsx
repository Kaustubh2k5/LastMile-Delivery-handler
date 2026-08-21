"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell, authBtn } from "@/components/auth-ui";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("err");
      setMessage("Missing verification token.");
      return;
    }
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");
        setState("ok");
        setMessage(data.message || "Email verified.");
      })
      .catch((err) => {
        setState("err");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token]);

  return (
    <AuthShell
      title={state === "ok" ? "Email verified" : state === "err" ? "Verification failed" : "Verifying…"}
      subtitle={message || "Please wait while we confirm your email."}
    >
      {state === "ok" && (
        <Link href="/login" className={`${authBtn} inline-block text-center`}>
          Continue to sign in
        </Link>
      )}
      {state === "err" && (
        <div className="space-y-3">
          <Link href="/login" className={`${authBtn} inline-block text-center`}>
            Back to sign in
          </Link>
          <p className="text-center text-sm text-[var(--muted)]">
            Need a new link? Sign in attempt will offer resend, or register again.
          </p>
        </div>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthShell title="Verifying…" subtitle="Loading…"><div></div></AuthShell>}>
      <VerifyInner />
    </Suspense>
  );
}
