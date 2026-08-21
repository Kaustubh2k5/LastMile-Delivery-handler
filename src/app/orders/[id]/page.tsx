"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api, getStoredUser } from "@/lib/api-client";
import { AppShell, StatusBadge, Field, inputClass, btnPrimary, btnGhost } from "@/components/ui";

type TrackingEvent = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  actor: { name: string; role: string };
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  totalCharge: number;
  baseCharge: number;
  codSurcharge: number;
  pickupAddress: string;
  dropAddress: string;
  pickupPin: string;
  dropPin: string;
  billableWeightKg: number;
  volumetricWeightKg: number;
  actualWeightKg: number;
  orderType: string;
  paymentType: string;
  failureReason: string | null;
  chargeBreakdown: Record<string, unknown>;
  pickupZone: { name: string; code: string };
  dropZone: { name: string; code: string };
  agent: { name: string; phone: string | null } | null;
  trackingEvents: TrackingEvent[];
  attempts: { attemptNo: number; scheduledDate: string; notes: string | null }[];
  notifications: { channel: string; status: string; createdAt: string; subject: string | null }[];
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [role, setRole] = useState<string>("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const data = await api<{ order: OrderDetail }>(`/api/orders/${params.id}`);
    setOrder(data.order);
  }, [params.id]);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setRole(u.role);
    load().catch((e) => setError(e.message));
  }, [router, load]);

  async function reschedule(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/orders/${params.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledDate: new Date(date).toISOString() }),
      });
      setMsg("Rescheduled. Admin can reassign an agent.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reschedule failed");
    }
  }

  async function cancel() {
    if (!confirm("Cancel this order? It stays in your past order history.")) return;
    setError("");
    try {
      await api(`/api/orders/${params.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      setMsg("Order cancelled.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  if (!order) {
    return (
      <AppShell title="Tracking">
        <p className="text-[var(--muted)]">{error || "Loading…"}</p>
      </AppShell>
    );
  }

  const back =
    role === "ADMIN" ? "/admin" : role === "AGENT" ? "/agent" : "/customer";

  return (
    <AppShell title="Order tracking">
      <Link href={back} className={`${btnGhost} mb-4 inline-block`}>
        ← Back
      </Link>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold">{order.orderNumber}</h1>
              <p className="text-sm text-[var(--muted)]">
                {order.orderType} · {order.paymentType} · ₹{order.totalCharge.toFixed(2)}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[var(--muted)]">Pickup</p>
              <p>
                {order.pickupAddress} ({order.pickupPin}) · {order.pickupZone.name}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Drop</p>
              <p>
                {order.dropAddress} ({order.dropPin}) · {order.dropZone.name}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Weights (kg)</p>
              <p>
                actual {order.actualWeightKg} · vol {order.volumetricWeightKg} · billable{" "}
                {order.billableWeightKg}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Agent</p>
              <p>{order.agent ? `${order.agent.name} (${order.agent.phone || "—"})` : "Unassigned"}</p>
            </div>
          </div>
          {order.failureReason && (
            <p className="mt-3 text-sm text-rose-700">Failure: {order.failureReason}</p>
          )}

          <h2 className="mb-3 mt-8 text-lg font-semibold">Timeline</h2>
          <ol className="relative space-y-4 border-l border-[var(--line)] pl-5">
            {order.trackingEvents.map((ev) => (
              <li key={ev.id}>
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-[var(--accent)]" />
                <p className="font-medium">
                  {ev.fromStatus ? `${ev.fromStatus} → ` : ""}
                  {ev.toStatus}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {new Date(ev.createdAt).toLocaleString()} · {ev.actor.name} ({ev.actor.role})
                </p>
                {ev.note && <p className="text-sm">{ev.note}</p>}
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-4">
          <div className="panel text-sm">
            <h3 className="font-semibold">Charge snapshot</h3>
            <p className="mt-2 text-[var(--muted)]">
              Base ₹{order.baseCharge.toFixed(2)} + COD ₹{order.codSurcharge.toFixed(2)}
            </p>
            <pre className="mt-3 max-h-48 overflow-auto rounded bg-white p-2 text-xs">
              {JSON.stringify(order.chargeBreakdown, null, 2)}
            </pre>
          </div>

          <div className="panel text-sm">
            <h3 className="font-semibold">Attempts</h3>
            <ul className="mt-2 space-y-2">
              {order.attempts.map((a) => (
                <li key={a.attemptNo}>
                  #{a.attemptNo} · {new Date(a.scheduledDate).toLocaleString()}
                  {a.notes ? ` — ${a.notes}` : ""}
                </li>
              ))}
            </ul>
          </div>

          {role === "CUSTOMER" && order.status === "FAILED" && (
            <form onSubmit={reschedule} className="panel space-y-3">
              <h3 className="font-semibold">Reschedule delivery</h3>
              <Field label="New date & time">
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
              <button type="submit" className={btnPrimary}>
                Reschedule
              </button>
            </form>
          )}

          {role === "CUSTOMER" &&
            ["CREATED", "ASSIGNED", "RESCHEDULED"].includes(order.status) && (
              <div className="panel space-y-3">
                <h3 className="font-semibold">Cancel order</h3>
                <p className="text-sm text-[var(--muted)]">
                  Cancelled orders remain visible in past history.
                </p>
                <button type="button" className={btnGhost} onClick={cancel}>
                  Cancel this order
                </button>
              </div>
            )}

          <div className="panel text-sm">
            <h3 className="font-semibold">Notifications</h3>
            <ul className="mt-2 space-y-1 text-[var(--muted)]">
              {order.notifications?.map((n, i) => (
                <li key={i}>
                  {n.channel} · {n.status} · {new Date(n.createdAt).toLocaleString()}
                </li>
              ))}
              {!order.notifications?.length && <li>None yet</li>}
            </ul>
          </div>
        </aside>
      </div>
      {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
      {msg && <p className="mt-4 text-sm text-emerald-700">{msg}</p>}
    </AppShell>
  );
}
