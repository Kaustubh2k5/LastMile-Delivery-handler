"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getStoredUser } from "@/lib/api-client";
import { AppShell, StatusBadge, Field, inputClass, btnPrimary, btnGhost } from "@/components/ui";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  pickupPin: string;
  dropPin: string;
};

const NEXT: Record<string, string[]> = {
  ASSIGNED: ["PICKED_UP", "FAILED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
};

export default function AgentPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [lat, setLat] = useState("28.65");
  const [lng, setLng] = useState("77.2");
  const [status, setStatus] = useState("AVAILABLE");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const data = await api<{ orders: OrderRow[] }>("/api/agent/orders");
    setOrders(data.orders);
  }, []);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    if (u.role !== "AGENT") {
      router.replace(u.role === "ADMIN" ? "/admin" : "/customer");
      return;
    }
    load().catch((e) => setError(e.message));
  }, [router, load]);

  async function saveLocation() {
    setError("");
    try {
      await api("/api/agent/location", {
        method: "PATCH",
        body: JSON.stringify({
          lat: Number(lat),
          lng: Number(lng),
          agentStatus: status,
        }),
      });
      setMsg("Location / availability updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function setOrderStatus(id: string, next: string) {
    setError("");
    try {
      const body: { status: string; failureReason?: string } = { status: next };
      if (next === "FAILED") body.failureReason = "Customer unavailable / access issue";
      await api(`/api/agent/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  }

  return (
    <AppShell title="Delivery agent">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel space-y-3 lg:col-span-1">
          <h2 className="text-lg font-semibold">My location</h2>
          <Field label="Latitude">
            <input className={inputClass} value={lat} onChange={(e) => setLat(e.target.value)} />
          </Field>
          <Field label="Longitude">
            <input className={inputClass} value={lng} onChange={(e) => setLng(e.target.value)} />
          </Field>
          <Field label="Availability">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="BUSY">BUSY</option>
              <option value="OFFLINE">OFFLINE</option>
            </select>
          </Field>
          <button type="button" className={btnPrimary} onClick={saveLocation}>
            Save
          </button>
          {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        </section>

        <section className="panel lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Assigned orders</h2>
            <button type="button" className={btnGhost} onClick={() => load()}>
              Refresh
            </button>
          </div>
          <ul className="space-y-4">
            {orders.map((o) => (
              <li key={o.id} className="rounded-lg border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/orders/${o.id}`} className="font-medium text-[var(--accent)]">
                    {o.orderNumber}
                  </Link>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {o.pickupAddress} ({o.pickupPin}) → {o.dropAddress} ({o.dropPin})
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(NEXT[o.status] || []).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={btnGhost}
                      onClick={() => setOrderStatus(o.id, s)}
                    >
                      Mark {s.replaceAll("_", " ")}
                    </button>
                  ))}
                </div>
              </li>
            ))}
            {orders.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No assignments yet.</p>
            )}
          </ul>
        </section>
      </div>
      {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
    </AppShell>
  );
}
