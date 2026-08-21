"use client";

import Link from "next/link";
import { FormEvent, ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 20% 10%, #b8d4c8 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, #d5e6dc 0%, transparent 50%)",
        }}
      />
      <div className="relative mx-auto grid min-h-screen max-w-5xl lg:grid-cols-2">
        <aside className="hidden flex-col justify-between px-10 py-12 lg:flex">
          <Link href="/" className="font-display text-3xl font-semibold tracking-tight">
            Last<span className="text-[var(--accent)]">Mile</span>
          </Link>
          <div>
            <p className="font-display text-4xl font-semibold leading-tight text-[var(--ink)]">
              Ship smarter.
              <br />
              Track every mile.
            </p>
            <p className="mt-4 max-w-sm text-[var(--muted)]">
              Zone-based pricing, verified accounts, and live delivery updates —
              with email confirmation at every step.
            </p>
          </div>
          <p className="text-xs text-[var(--muted)]">Secure JWT sessions · Email verification required</p>
        </aside>

        <main className="flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="font-display mb-8 inline-block text-2xl font-semibold lg:hidden"
            >
              Last<span className="text-[var(--accent)]">Mile</span>
            </Link>
            <div className="panel space-y-5 shadow-md">
              <div>
                <h1 className="font-display text-2xl font-semibold">{title}</h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
                )}
              </div>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-[var(--ink)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

export const authInput =
  "w-full rounded-lg border border-[var(--line)] bg-white px-3.5 py-2.5 text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

export const authBtn =
  "w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-50";

export function AuthForm({
  onSubmit,
  children,
}: {
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {children}
    </form>
  );
}
