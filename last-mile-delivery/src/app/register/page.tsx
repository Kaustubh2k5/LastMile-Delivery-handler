"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AuthShell,
  AuthField,
  AuthForm,
  authInput,
  authBtn,
} from "@/components/auth-ui";

import dynamic from "next/dynamic";
import { useCallback } from "react";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    role: "CUSTOMER",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setForm((prev) => ({ ...prev, lat, lng }));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (form.role === "AGENT" && (form.lat === null || form.lng === null)) {
      setError("Please drop a pin on the map to set your location");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          role: form.role,
          currentLat: form.lat,
          currentLng: form.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      router.push(
        `/verify-email/pending?email=${encodeURIComponent(form.email)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="We'll send a verification link to your email before you can place orders."
    >
      <AuthForm onSubmit={onSubmit}>
        <AuthField label="I am a...">
          <select
            className={authInput}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            required
          >
            <option value="CUSTOMER">Customer</option>
            <option value="AGENT">Delivery Driver</option>
          </select>
        </AuthField>
        <AuthField label="Full name">
          <input
            className={authInput}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoComplete="name"
          />
        </AuthField>
        <AuthField label="Email" hint="Must be a real inbox — verification is required.">
          <input
            className={authInput}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
          />
        </AuthField>
        <AuthField label="Phone (optional)">
          <input
            className={authInput}
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
          />
        </AuthField>
        
        {form.role === "AGENT" && (
          <AuthField label="Your Location" hint="Tap on the map to set your current location">
            <MapPicker onLocationSelect={handleLocationSelect} />
          </AuthField>
        )}

        <AuthField label="Password">
          <input
            className={authInput}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </AuthField>
        <AuthField label="Confirm password">
          <input
            className={authInput}
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
            autoComplete="new-password"
          />
        </AuthField>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}

        <button type="submit" className={authBtn} disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </AuthForm>

      <p className="text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--accent)] underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
