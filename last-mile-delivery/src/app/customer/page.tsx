"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getStoredUser } from "@/lib/api-client";
import {
  AppShell,
  StatusBadge,
  Field,
  inputClass,
  btnPrimary,
  btnGhost,
} from "@/components/ui";

type Quote = {
  totalCharge: number;
  baseCharge: number;
  codSurcharge: number;
  billableWeightKg: number;
  volumetricWeightKg: number;
  actualWeightKg: number;
  scope: string;
  pickupZone: { name: string; code: string };
  dropZone: { name: string; code: string };
};

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  totalCharge: number;
  pickupPin: string;
  dropPin: string;
  createdAt: string;
};

type AreaOpt = { pinCode: string; name: string; city: string; zoneCode: string };

const emptyForm = {
  pickupAddress: "",
  pickupPin: "",
  pickupLat: "",
  pickupLng: "",
  dropAddress: "",
  dropPin: "",
  dropLat: "",
  dropLng: "",
  lengthCm: "",
  breadthCm: "",
  heightCm: "",
  actualWeightKg: "",
  orderType: "B2C" as "B2B" | "B2C",
  paymentType: "PREPAID" as "PREPAID" | "COD",
};

const ACTIVE = new Set([
  "CREATED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "FAILED",
  "RESCHEDULED",
]);

export default function CustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [areas, setAreas] = useState<AreaOpt[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    const data = await api<{ orders: OrderRow[] }>("/api/orders");
    setOrders(data.orders);
  }, []);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    if (u.role !== "CUSTOMER") {
      router.replace(u.role === "ADMIN" ? "/admin" : "/agent");
      return;
    }
    Promise.all([
      loadOrders(),
      api<{ zones: { code: string; areas: { pinCode: string; name: string; city: string }[] }[] }>(
        "/api/admin/zones"
      ).then((z) => {
        const opts: AreaOpt[] = [];
        for (const zone of z.zones) {
          for (const a of zone.areas) {
            opts.push({
              pinCode: a.pinCode,
              name: a.name,
              city: a.city,
              zoneCode: zone.code,
            });
          }
        }
        setAreas(opts.sort((a, b) => a.pinCode.localeCompare(b.pinCode)));
      }),
    ]).catch((e) => setError(e.message));
  }, [router, loadOrders]);

  const activeOrders = useMemo(
    () => orders.filter((o) => ACTIVE.has(o.status)),
    [orders]
  );
  const pastOrders = useMemo(
    () => orders.filter((o) => !ACTIVE.has(o.status)),
    [orders]
  );

  function payload() {
    return {
      pickupAddress: form.pickupAddress,
      pickupPin: form.pickupPin,
      pickupLat: form.pickupLat ? Number(form.pickupLat) : null,
      pickupLng: form.pickupLng ? Number(form.pickupLng) : null,
      dropAddress: form.dropAddress,
      dropPin: form.dropPin,
      dropLat: form.dropLat ? Number(form.dropLat) : null,
      dropLng: form.dropLng ? Number(form.dropLng) : null,
      lengthCm: Number(form.lengthCm),
      breadthCm: Number(form.breadthCm),
      heightCm: Number(form.heightCm),
      actualWeightKg: Number(form.actualWeightKg),
      orderType: form.orderType,
      paymentType: form.paymentType,
    };
  }

  async function onQuote(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);
    try {
      const data = await api<{ quote: Quote }>("/api/orders/quote", {
        method: "POST",
        body: JSON.stringify(payload()),
      });
      setQuote(data.quote);
    } catch (err) {
      setQuote(null);
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm() {
    setError("");
    setLoading(true);
    try {
      await api("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload()),
      });
      setMsg("Order placed. Confirmation email is on the way.");
      setQuote(null);
      setForm(emptyForm);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this order? It will remain in your past history.")) return;
    setError("");
    try {
      await api(`/api/orders/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      setMsg("Order cancelled.");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  const pinOptions = (
    <>
      <option value="">Select PIN</option>
      {areas.map((a) => (
        <option key={a.pinCode} value={a.pinCode}>
          {a.pinCode} — {a.name}, {a.city} ({a.zoneCode})
        </option>
      ))}
    </>
  );

  function OrderList({
    list,
    allowCancel,
  }: {
    list: OrderRow[];
    allowCancel?: boolean;
  }) {
    if (!list.length) {
      return <p className="text-sm text-[var(--muted)]">None yet.</p>;
    }
    return (
      <ul className="space-y-3">
        {list.map((o) => (
          <li
            key={o.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white px-3 py-3"
          >
            <div>
              <Link
                href={`/orders/${o.id}`}
                className="font-medium text-[var(--accent)] hover:underline"
              >
                {o.orderNumber}
              </Link>
              <p className="text-xs text-[var(--muted)]">
                {o.pickupPin} → {o.dropPin} · ₹{o.totalCharge.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={o.status} />
              {allowCancel &&
                ["CREATED", "ASSIGNED", "RESCHEDULED"].includes(o.status) && (
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => cancelOrder(o.id)}
                  >
                    Cancel
                  </button>
                )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <AppShell title="Customer">
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="panel">
          <h2 className="mb-4 text-lg font-semibold">Place an order</h2>
          <form onSubmit={onQuote} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pickup address">
                <input
                  className={inputClass}
                  value={form.pickupAddress}
                  onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
                  required
                />
              </Field>
              <Field label="Pickup PIN">
                <select
                  className={inputClass}
                  value={form.pickupPin}
                  onChange={(e) => setForm({ ...form, pickupPin: e.target.value })}
                  required
                >
                  {pinOptions}
                </select>
              </Field>
              <Field label="Drop address">
                <input
                  className={inputClass}
                  value={form.dropAddress}
                  onChange={(e) => setForm({ ...form, dropAddress: e.target.value })}
                  required
                />
              </Field>
              <Field label="Drop PIN">
                <select
                  className={inputClass}
                  value={form.dropPin}
                  onChange={(e) => setForm({ ...form, dropPin: e.target.value })}
                  required
                >
                  {pinOptions}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["lengthCm", "breadthCm", "heightCm"] as const).map((k) => (
                <Field key={k} label={k.replace("Cm", " (cm)")}>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    required
                  />
                </Field>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Actual weight (kg)">
                <input
                  className={inputClass}
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={form.actualWeightKg}
                  onChange={(e) => setForm({ ...form, actualWeightKg: e.target.value })}
                  required
                />
              </Field>
              <Field label="Order type">
                <select
                  className={inputClass}
                  value={form.orderType}
                  onChange={(e) =>
                    setForm({ ...form, orderType: e.target.value as "B2B" | "B2C" })
                  }
                >
                  <option value="B2C">B2C</option>
                  <option value="B2B">B2B</option>
                </select>
              </Field>
              <Field label="Payment">
                <select
                  className={inputClass}
                  value={form.paymentType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      paymentType: e.target.value as "PREPAID" | "COD",
                    })
                  }
                >
                  <option value="PREPAID">Prepaid</option>
                  <option value="COD">COD</option>
                </select>
              </Field>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Optional lat/lng improve auto-assignment accuracy (leave blank if unknown).
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["pickupLat", "Pickup lat"],
                  ["pickupLng", "Pickup lng"],
                  ["dropLat", "Drop lat"],
                  ["dropLng", "Drop lng"],
                ] as const
              ).map(([k, label]) => (
                <Field key={k} label={label}>
                  <input
                    className={inputClass}
                    type="number"
                    step="any"
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
            <button type="submit" className={btnPrimary} disabled={loading}>
              Calculate charge
            </button>
          </form>

          {quote && (
            <div className="mt-5 rounded-lg border border-[var(--line)] bg-white p-4 text-sm">
              <p className="font-medium">
                Quote: ₹{quote.totalCharge.toFixed(2)}{" "}
                <span className="text-[var(--muted)]">
                  ({quote.scope} · {quote.pickupZone.code} → {quote.dropZone.code})
                </span>
              </p>
              <ul className="mt-2 space-y-1 text-[var(--muted)]">
                <li>
                  Weights — actual {quote.actualWeightKg} · volumetric{" "}
                  {quote.volumetricWeightKg} · billable {quote.billableWeightKg} kg
                </li>
                <li>
                  Base ₹{quote.baseCharge.toFixed(2)} + COD ₹
                  {quote.codSurcharge.toFixed(2)}
                </li>
              </ul>
              <button
                type="button"
                className={`${btnPrimary} mt-3`}
                onClick={onConfirm}
                disabled={loading}
              >
                Confirm order
              </button>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
          {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
        </section>

        <div className="space-y-6">
          <section className="panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active orders</h2>
              <button type="button" className={btnGhost} onClick={() => loadOrders()}>
                Refresh
              </button>
            </div>
            <OrderList list={activeOrders} allowCancel />
          </section>
          <section className="panel">
            <h2 className="mb-4 text-lg font-semibold">Past orders</h2>
            <p className="mb-3 text-xs text-[var(--muted)]">
              Delivered and cancelled orders stay here for history.
            </p>
            <OrderList list={pastOrders} />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
