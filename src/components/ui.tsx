"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession, getStoredUser, SessionUser } from "@/lib/api-client";
import { useEffect, useState } from "react";

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function logout() {
    clearSession();
    router.push("/login");
  }

  const home =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "AGENT"
        ? "/agent"
        : "/customer";

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-[var(--panel)]/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href={home} className="font-display text-xl tracking-tight text-[var(--ink)]">
              Last<span className="text-[var(--accent)]">Mile</span>
            </Link>
            <span className="hidden text-sm text-[var(--muted)] sm:inline">{title}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <span className="text-[var(--muted)]">
                {user.name} · {user.role}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--wash)]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    CREATED: "bg-slate-200 text-slate-800",
    ASSIGNED: "bg-sky-100 text-sky-900",
    PICKED_UP: "bg-amber-100 text-amber-900",
    IN_TRANSIT: "bg-orange-100 text-orange-900",
    OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-900",
    DELIVERED: "bg-emerald-100 text-emerald-900",
    FAILED: "bg-rose-100 text-rose-900",
    RESCHEDULED: "bg-yellow-100 text-yellow-900",
    CANCELLED: "bg-zinc-200 text-zinc-700",
  };
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${color[status] || "bg-gray-100"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)]";

export const btnPrimary =
  "rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-dark)] disabled:opacity-50";

export const btnGhost =
  "rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--wash)] disabled:opacity-50";
