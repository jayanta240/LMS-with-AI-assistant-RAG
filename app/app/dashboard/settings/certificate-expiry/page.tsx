"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";

const BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

export default function CertificateExpirySettingsPage() {
  const [validity, setValidity] = useState("none");
  const [customDays, setCustomDays] = useState("365");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${BASE}/api/company/certificate-expiry-settings`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.detail || "Could not load certificate settings.");
        const days = data?.settings?.validity_days;
        if (days == null) setValidity("none");
        else if ([180, 365, 730].includes(days)) setValidity(String(days));
        else { setValidity("custom"); setCustomDays(String(days)); }
      } catch (err: any) { setError(err?.message || "Could not load settings."); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function save() {
    setSaving(true); setMessage(""); setError("");
    try {
      const days = validity === "none" ? null : validity === "custom" ? Number(customDays) : Number(validity);
      if (days !== null && (!Number.isInteger(days) || days <= 0)) throw new Error("Enter a valid number of days.");
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE}/api/company/certificate-expiry-settings`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ validity_days: days }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || "Could not save settings.");
      setMessage("Certificate validity settings saved. They apply to newly issued certificates.");
    } catch (err: any) { setError(err?.message || "Could not save settings."); }
    finally { setSaving(false); }
  }

  return <DashboardLayout><div className="mx-auto max-w-3xl space-y-6">
    <div><Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Back to Settings</Link><p className="mt-5 text-sm font-semibold" style={{ color: "var(--brand-accent)" }}>Configuration</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Certificate Expiry Management</h1><p className="mt-2 text-sm text-slate-500">Configure one validity period for all certificates issued by your company.</p></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: "color-mix(in srgb, var(--brand-primary) 10%, white)", color: "var(--brand-primary)" }}><CalendarClock size={21} /></div><div><h2 className="font-semibold text-slate-900">Default certificate validity</h2><p className="text-sm text-slate-500">Existing certificates remain unchanged.</p></div></div>
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading settings…</p> : <div className="mt-6 space-y-4">
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="radio" name="validity" checked={validity === "none"} onChange={() => setValidity("none")} /><span><span className="block text-sm font-semibold text-slate-800">No expiry</span><span className="text-xs text-slate-500">Certificates remain valid indefinitely.</span></span></label>
        {[{ value: "180", label: "6 months" }, { value: "365", label: "1 year" }, { value: "730", label: "2 years" }].map(option => <label key={option.value} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="radio" name="validity" checked={validity === option.value} onChange={() => setValidity(option.value)} /><span className="text-sm font-semibold text-slate-800">{option.label}</span></label>)}
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="radio" name="validity" checked={validity === "custom"} onChange={() => setValidity("custom")} /><span className="text-sm font-semibold text-slate-800">Custom duration</span></label>
        {validity === "custom" && <div className="ml-7 max-w-xs"><label htmlFor="custom-days" className="mb-1 block text-xs font-medium text-slate-600">Validity in days</label><input id="custom-days" type="number" min="1" value={customDays} onChange={event => setCustomDays(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" /></div>}
      </div>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <div className="mt-6 flex justify-end"><button type="button" disabled={loading || saving} onClick={save} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)" }}><Save size={16} />{saving ? "Saving…" : "Save Settings"}</button></div>
    </section><p className="text-xs leading-5 text-slate-500">The selected validity period is applied when a new certificate is issued. Changing this setting does not recalculate or alter previously issued certificates.</p>
  </div></DashboardLayout>;
}
