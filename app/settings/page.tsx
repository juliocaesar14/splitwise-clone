"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [upiId, setUpiId] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [notificationPref, setNotificationPref] = useState("WEEKLY");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setUpiId(data.upi_id ?? "");
        setCurrency(data.preferred_currency ?? "INR");
        setNotificationPref(data.notification_pref ?? "WEEKLY");
      });
  }, [status]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, upiId, currency, notificationPref }),
      });
      if (!res.ok) return setError("failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c8f560] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-mono">
      <header className="border-b border-[#1e1e1e] px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.push("/dashboard")} className="text-[#666] hover:text-white text-sm transition-colors">← dashboard</button>
        <span className="text-white font-bold tracking-tight">settings</span>
        <div className="w-16" />
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-6">
        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8f560] transition-colors" />
        </div>

        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8f560] transition-colors" />
        </div>

        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">UPI ID</label>
          <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" className="w-full bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8f560] transition-colors" />
          <p className="text-[#444] text-xs">used for UPI deep links in settle up</p>
        </div>

        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#c8f560] transition-colors">
            <option value="INR">INR — ₹</option>
            <option value="USD">USD — $</option>
            <option value="EUR">EUR — €</option>
            <option value="GBP">GBP — £</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">notifications</label>
          <div className="flex gap-2">
            {["WEEKLY", "MONTHLY", "NEVER"].map((p) => (
              <button key={p} onClick={() => setNotificationPref(p)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${notificationPref === p ? "bg-[#c8f560] text-black" : "bg-[#141414] border border-[#1e1e1e] text-[#666] hover:text-white"}`}>
                {p.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[#ff6b6b] text-xs">{error}</p>}

        <button onClick={handleSave} disabled={saving} className="w-full bg-[#c8f560] text-black font-bold py-3 rounded-xl hover:bg-[#d4f77a] transition-colors disabled:opacity-50">
          {saving ? "saving..." : saved ? "saved ✓" : "save changes"}
        </button>

        <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full bg-transparent border border-[#330000] text-[#ff6b6b] font-bold py-3 rounded-xl hover:bg-[#1a0000] transition-colors text-sm">
          sign out
        </button>
      </main>
    </div>
  );
}