import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230d7a5f' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="font-display text-5xl font-semibold tracking-tight text-[var(--ink)] sm:text-6xl md:text-7xl">
          Last<span className="text-[var(--accent)]">Mile</span>
        </p>
        <h1 className="mt-4 max-w-xl text-2xl font-medium text-[var(--ink)] sm:text-3xl">
          Quote, assign, and track every delivery with a configurable rate engine.
        </h1>
        <p className="mt-4 max-w-lg text-[var(--muted)]">
          Zone detection, volumetric billing, nearest-agent auto-assignment, and
          immutable status history for customers, agents, and ops admins.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-dark)]"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-[var(--line)] bg-white/80 px-5 py-2.5 text-sm font-medium hover:bg-white"
          >
            Create customer account
          </Link>
        </div>
        <p className="mt-10 text-xs text-[var(--muted)]">
          Demo: admin@lastmile.local · customer@lastmile.local · agent1@lastmile.local
          — password <code className="rounded bg-white/70 px-1">password123</code>
        </p>
      </main>
    </div>
  );
}
