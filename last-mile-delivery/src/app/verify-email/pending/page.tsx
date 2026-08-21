"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api-client";
import { AuthShell, authBtn } from "@/components/auth-ui";

function PendingInner() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function resend() {
    setMsg("");
    setErr("");
    try {
      await api("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMsg("Verification email resent.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to resend");
    }
  }

  return (
    <AuthShell
      title="Check your inbox"
      subtitle={
        email
          ? `We sent a verification link to ${email}. Open it to activate your account.`
          : "We sent a verification link to your email."
      }
    >
      <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
        <li>Open the email from LastMile</li>
        <li>Click “Verify my email”</li>
        <li>Return here and sign in</li>
      </ol>
      {email && (
        <button type="button" className={authBtn} onClick={resend}>
          Resend verification email
        </button>
      )}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {err && <p className="text-sm text-rose-700">{err}</p>}
      <Link href="/login" className="block text-center text-sm text-[var(--accent)] underline">
        Back to sign in
      </Link>
    </AuthShell>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={<AuthShell title="Check your inbox"><div></div></AuthShell>}>
      <PendingInner />
    </Suspense>
  );
}
