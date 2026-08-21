"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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

type Zone = { id: string; name: string; code: string; areas: Area[] };
type Area = { id: string; name: string; pinCode: string; city: string; zoneId: string };
type RateCard = {
  id: string;
  orderType: string;
  scope: string;
  minWeightKg: number;
  maxWeightKg: number | null;
  ratePerKg: number;
  flatRate: number | null;
  label: string | null;
  active: boolean;
};
type Surcharge = { id: string; orderType: string; surchargeAmount: number };
type Agent = { id: string; name: string; email: string; agentStatus: string | null };
type Customer = { id: string; name: string; email: string };
type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  totalCharge: number;
  pickupZoneId: string;
  dropZoneId: string;
  agentId: string | null;
  customer: { name: string };
  agent: { name: string } | null;
  pickupZone: { code: string };
  dropZone: { code: string };
};

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"orders" | "zones" | "rates" | "create">("orders");
  const [zones, setZones] = useState<Zone[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState({ status: "", zoneId: "", agentId: "" });
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [zoneForm, setZoneForm] = useState({ name: "", code: "" });
  const [areaForm, setAreaForm] = useState({ zoneId: "", name: "", pinCode: "", city: "" });
  const [rateForm, setRateForm] = useState({
    orderType: "B2C",
    scope: "INTRA",
    minWeightKg: "0",
    maxWeightKg: "5",
    ratePerKg: "25",
    flatRate: "",
    label: "",
  });
  const [codForm, setCodForm] = useState({ orderType: "B2C", surchargeAmount: "30" });
  const [createForm, setCreateForm] = useState({
    customerId: "",
    pickupAddress: "Admin pickup desk",
    pickupPin: "110009",
    pickupLat: "28.7193",
    pickupLng: "77.1934",
    dropAddress: "Cyber City tower",
    dropPin: "122002",
    dropLat: "28.4945",
    dropLng: "77.0885",
    lengthCm: "40",
    breadthCm: "30",
    heightCm: "20",
    actualWeightKg: "8",
    orderType: "B2B",
    paymentType: "PREPAID",
  });

  const refresh = useCallback(async () => {
    const q = new URLSearchParams();
    if (filter.status) q.set("status", filter.status);
    if (filter.zoneId) q.set("zoneId", filter.zoneId);
    if (filter.agentId) q.set("agentId", filter.agentId);
    const [z, r, c, u, o] = await Promise.all([
      api<{ zones: Zone[] }>("/api/admin/zones"),
      api<{ rateCards: RateCard[] }>("/api/admin/rate-cards"),
      api<{ surcharges: Surcharge[] }>("/api/admin/cod-surcharges"),
      api<{ agents: Agent[]; customers: Customer[] }>("/api/admin/users"),
      api<{ orders: OrderRow[] }>(`/api/orders?${q.toString()}`),
    ]);
    setZones(z.zones);
    setRateCards(r.rateCards);
    setSurcharges(c.surcharges);
    setAgents(u.agents);
    setCustomers(u.customers);
    setOrders(o.orders);
    setAreaForm((f) => (f.zoneId || !z.zones[0] ? f : { ...f, zoneId: z.zones[0].id }));
    setCreateForm((f) =>
      f.customerId || !u.customers[0] ? f : { ...f, customerId: u.customers[0].id }
    );
  }, [filter]);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    if (u.role !== "ADMIN") {
      router.replace(u.role === "AGENT" ? "/agent" : "/customer");
      return;
    }
    refresh().catch((e) => setError(e.message));
  }, [router, refresh]);

  async function addZone(e: FormEvent) {
    e.preventDefault();
    await api("/api/admin/zones", { method: "POST", body: JSON.stringify(zoneForm) });
    setZoneForm({ name: "", code: "" });
    setMsg("Zone created");
    await refresh();
  }

  async function addArea(e: FormEvent) {
    e.preventDefault();
    await api("/api/admin/areas", { method: "POST", body: JSON.stringify(areaForm) });
    setMsg("Area mapped");
    await refresh();
  }

  async function addRate(e: FormEvent) {
    e.preventDefault();
    await api("/api/admin/rate-cards", {
      method: "POST",
      body: JSON.stringify({
        orderType: rateForm.orderType,
        scope: rateForm.scope,
        minWeightKg: Number(rateForm.minWeightKg),
        maxWeightKg: rateForm.maxWeightKg === "" ? null : Number(rateForm.maxWeightKg),
        ratePerKg: Number(rateForm.ratePerKg),
        flatRate: rateForm.flatRate === "" ? null : Number(rateForm.flatRate),
        label: rateForm.label || null,
      }),
    });
    setMsg("Rate card added");
    await refresh();
  }

  async function saveCod(e: FormEvent) {
    e.preventDefault();
    await api("/api/admin/cod-surcharges", {
      method: "POST",
      body: JSON.stringify({
        orderType: codForm.orderType,
        surchargeAmount: Number(codForm.surchargeAmount),
      }),
    });
    setMsg("COD surcharge saved");
    await refresh();
  }

  async function assign(orderId: string, auto: boolean, agentId?: string) {
    setError("");
    try {
      await api(`/api/admin/orders/${orderId}/assign`, {
        method: "POST",
        body: JSON.stringify(auto ? { auto: true } : { agentId }),
      });
      setMsg(auto ? "Auto-assigned nearest available agent" : "Agent assigned");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    }
  }

  async function overrideStatus(orderId: string, status: string) {
    await api(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note: "Admin override", override: true }),
    });
    await refresh();
  }

  async function createOnBehalf(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: createForm.customerId,
          pickupAddress: createForm.pickupAddress,
          pickupPin: createForm.pickupPin,
          pickupLat: Number(createForm.pickupLat),
          pickupLng: Number(createForm.pickupLng),
          dropAddress: createForm.dropAddress,
          dropPin: createForm.dropPin,
          dropLat: Number(createForm.dropLat),
          dropLng: Number(createForm.dropLng),
          lengthCm: Number(createForm.lengthCm),
          breadthCm: Number(createForm.breadthCm),
          heightCm: Number(createForm.heightCm),
          actualWeightKg: Number(createForm.actualWeightKg),
          orderType: createForm.orderType,
          paymentType: createForm.paymentType,
        }),
      });
      setMsg("Order created on behalf of customer");
      setTab("orders");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  const tabs = [
    ["orders", "Orders"],
    ["zones", "Zones & areas"],
    ["rates", "Rate cards"],
    ["create", "Create order"],
  ] as const;

  return (
    <AppShell title="Admin console">
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? btnPrimary : btnGhost}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {msg && <p className="mb-3 text-sm text-emerald-700">{msg}</p>}
      {error && <p className="mb-3 text-sm text-rose-700">{error}</p>}

      {tab === "orders" && (
        <section className="panel">
          <div className="mb-4 flex flex-wrap gap-3">
            <select
              className={inputClass + " max-w-[180px]"}
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">All statuses</option>
              {[
                "CREATED",
                "ASSIGNED",
                "PICKED_UP",
                "IN_TRANSIT",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "FAILED",
                "RESCHEDULED",
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className={inputClass + " max-w-[180px]"}
              value={filter.zoneId}
              onChange={(e) => setFilter({ ...filter, zoneId: e.target.value })}
            >
              <option value="">All zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.code}
                </option>
              ))}
            </select>
            <select
              className={inputClass + " max-w-[180px]"}
              value={filter.agentId}
              onChange={(e) => setFilter({ ...filter, agentId: e.target.value })}
            >
              <option value="">All agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button type="button" className={btnGhost} onClick={() => refresh()}>
              Apply
            </button>
          </div>
          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-[var(--line)] bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/orders/${o.id}`} className="font-medium text-[var(--accent)]">
                    {o.orderNumber}
                  </Link>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-[var(--muted)]">
                  {o.customer.name} · {o.pickupZone.code}→{o.dropZone.code} · ₹
                  {o.totalCharge.toFixed(2)} · Agent: {o.agent?.name || "—"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(o.status === "CREATED" || o.status === "RESCHEDULED") && (
                    <>
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => assign(o.id, true)}
                      >
                        Auto-assign
                      </button>
                      <select
                        className={inputClass + " max-w-[200px]"}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) assign(o.id, false, e.target.value);
                        }}
                      >
                        <option value="">Manual assign…</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.agentStatus})
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <select
                    className={inputClass + " max-w-[200px]"}
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) overrideStatus(o.id, e.target.value);
                    }}
                  >
                    <option value="">Override status…</option>
                    {[
                      "ASSIGNED",
                      "PICKED_UP",
                      "IN_TRANSIT",
                      "OUT_FOR_DELIVERY",
                      "DELIVERED",
                      "FAILED",
                      "RESCHEDULED",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "zones" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={addZone} className="panel space-y-3">
            <h2 className="font-semibold">Add zone</h2>
            <Field label="Name">
              <input
                className={inputClass}
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Code">
              <input
                className={inputClass}
                value={zoneForm.code}
                onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value })}
                required
              />
            </Field>
            <button className={btnPrimary} type="submit">
              Create zone
            </button>
          </form>
          <form onSubmit={addArea} className="panel space-y-3">
            <h2 className="font-semibold">Map area / PIN to zone</h2>
            <Field label="Zone">
              <select
                className={inputClass}
                value={areaForm.zoneId}
                onChange={(e) => setAreaForm({ ...areaForm, zoneId: e.target.value })}
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Area name">
              <input
                className={inputClass}
                value={areaForm.name}
                onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                required
              />
            </Field>
            <Field label="PIN">
              <input
                className={inputClass}
                value={areaForm.pinCode}
                onChange={(e) => setAreaForm({ ...areaForm, pinCode: e.target.value })}
                required
              />
            </Field>
            <Field label="City">
              <input
                className={inputClass}
                value={areaForm.city}
                onChange={(e) => setAreaForm({ ...areaForm, city: e.target.value })}
                required
              />
            </Field>
            <button className={btnPrimary} type="submit">
              Add area
            </button>
          </form>
          <div className="panel lg:col-span-2">
            <h2 className="mb-3 font-semibold">Current map</h2>
            {zones.map((z) => (
              <div key={z.id} className="mb-4">
                <p className="font-medium">
                  {z.name} <span className="text-[var(--muted)]">({z.code})</span>
                </p>
                <ul className="mt-1 text-sm text-[var(--muted)]">
                  {z.areas.map((a) => (
                    <li key={a.id}>
                      {a.pinCode} — {a.name}, {a.city}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "rates" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={addRate} className="panel space-y-3">
            <h2 className="font-semibold">Add rate card band</h2>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Order type">
                <select
                  className={inputClass}
                  value={rateForm.orderType}
                  onChange={(e) => setRateForm({ ...rateForm, orderType: e.target.value })}
                >
                  <option>B2C</option>
                  <option>B2B</option>
                </select>
              </Field>
              <Field label="Scope">
                <select
                  className={inputClass}
                  value={rateForm.scope}
                  onChange={(e) => setRateForm({ ...rateForm, scope: e.target.value })}
                >
                  <option>INTRA</option>
                  <option>INTER</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min kg">
                <input
                  className={inputClass}
                  value={rateForm.minWeightKg}
                  onChange={(e) => setRateForm({ ...rateForm, minWeightKg: e.target.value })}
                />
              </Field>
              <Field label="Max kg (blank = open)">
                <input
                  className={inputClass}
                  value={rateForm.maxWeightKg}
                  onChange={(e) => setRateForm({ ...rateForm, maxWeightKg: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Rate / kg">
                <input
                  className={inputClass}
                  value={rateForm.ratePerKg}
                  onChange={(e) => setRateForm({ ...rateForm, ratePerKg: e.target.value })}
                />
              </Field>
              <Field label="Flat rate (optional)">
                <input
                  className={inputClass}
                  value={rateForm.flatRate}
                  onChange={(e) => setRateForm({ ...rateForm, flatRate: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Label">
              <input
                className={inputClass}
                value={rateForm.label}
                onChange={(e) => setRateForm({ ...rateForm, label: e.target.value })}
              />
            </Field>
            <button className={btnPrimary} type="submit">
              Add band
            </button>
          </form>
          <form onSubmit={saveCod} className="panel space-y-3">
            <h2 className="font-semibold">COD surcharge</h2>
            <Field label="Order type">
              <select
                className={inputClass}
                value={codForm.orderType}
                onChange={(e) => setCodForm({ ...codForm, orderType: e.target.value })}
              >
                <option>B2C</option>
                <option>B2B</option>
              </select>
            </Field>
            <Field label="Amount (₹)">
              <input
                className={inputClass}
                value={codForm.surchargeAmount}
                onChange={(e) =>
                  setCodForm({ ...codForm, surchargeAmount: e.target.value })
                }
              />
            </Field>
            <button className={btnPrimary} type="submit">
              Save surcharge
            </button>
            <ul className="text-sm text-[var(--muted)]">
              {surcharges.map((s) => (
                <li key={s.id}>
                  {s.orderType}: ₹{s.surchargeAmount}
                </li>
              ))}
            </ul>
          </form>
          <div className="panel lg:col-span-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="py-2">Type</th>
                  <th>Scope</th>
                  <th>Weight</th>
                  <th>₹/kg</th>
                  <th>Flat</th>
                  <th>Label</th>
                </tr>
              </thead>
              <tbody>
                {rateCards.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--line)]/60">
                    <td className="py-2">{r.orderType}</td>
                    <td>{r.scope}</td>
                    <td>
                      {r.minWeightKg}–{r.maxWeightKg ?? "∞"}
                    </td>
                    <td>{r.ratePerKg}</td>
                    <td>{r.flatRate ?? "—"}</td>
                    <td>{r.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "create" && (
        <form onSubmit={createOnBehalf} className="panel mx-auto max-w-2xl space-y-3">
          <h2 className="font-semibold">Create order for customer</h2>
          <Field label="Customer">
            <select
              className={inputClass}
              value={createForm.customerId}
              onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pickup address">
              <input
                className={inputClass}
                value={createForm.pickupAddress}
                onChange={(e) =>
                  setCreateForm({ ...createForm, pickupAddress: e.target.value })
                }
              />
            </Field>
            <Field label="Pickup PIN">
              <input
                className={inputClass}
                value={createForm.pickupPin}
                onChange={(e) => setCreateForm({ ...createForm, pickupPin: e.target.value })}
              />
            </Field>
            <Field label="Drop address">
              <input
                className={inputClass}
                value={createForm.dropAddress}
                onChange={(e) => setCreateForm({ ...createForm, dropAddress: e.target.value })}
              />
            </Field>
            <Field label="Drop PIN">
              <input
                className={inputClass}
                value={createForm.dropPin}
                onChange={(e) => setCreateForm({ ...createForm, dropPin: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["lengthCm", "breadthCm", "heightCm"] as const).map((k) => (
              <Field key={k} label={k}>
                <input
                  className={inputClass}
                  value={createForm[k]}
                  onChange={(e) => setCreateForm({ ...createForm, [k]: e.target.value })}
                />
              </Field>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Weight kg">
              <input
                className={inputClass}
                value={createForm.actualWeightKg}
                onChange={(e) =>
                  setCreateForm({ ...createForm, actualWeightKg: e.target.value })
                }
              />
            </Field>
            <Field label="Type">
              <select
                className={inputClass}
                value={createForm.orderType}
                onChange={(e) => setCreateForm({ ...createForm, orderType: e.target.value })}
              >
                <option>B2B</option>
                <option>B2C</option>
              </select>
            </Field>
            <Field label="Payment">
              <select
                className={inputClass}
                value={createForm.paymentType}
                onChange={(e) =>
                  setCreateForm({ ...createForm, paymentType: e.target.value })
                }
              >
                <option>PREPAID</option>
                <option>COD</option>
              </select>
            </Field>
          </div>
          <button type="submit" className={btnPrimary}>
            Create order
          </button>
        </form>
      )}
    </AppShell>
  );
}
