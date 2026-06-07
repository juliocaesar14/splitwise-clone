"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function NewGroupPage() {
  const router = useRouter();
  const { status } = useSession();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  async function handleSubmit() {
    if (!name.trim()) return setError("group name is required");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, currency }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "something went wrong");
      router.push(`/groups/${data.id}`);
    } catch {
      setError("something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-mono">
      <header className="border-b border-[#1e1e1e] px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.push("/groups")} className="text-[#666] hover:text-white text-sm transition-colors">← groups</button>
        <span className="text-white font-bold tracking-tight">new group</span>
        <div className="w-16" />
      </header>

      <main className="max-w-lg mx-auto px-6 py-10 space-y-6">
        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="trip to goa, flat expenses..."
            className="w-full bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8f560] transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="optional"
            className="w-full bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8f560] transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#c8f560] transition-colors"
          >
            <option value="INR">INR — ₹ Indian Rupee</option>
            <option value="USD">USD — $ US Dollar</option>
            <option value="EUR">EUR — € Euro</option>
            <option value="GBP">GBP — £ British Pound</option>
          </select>
        </div>

        {error && <p className="text-[#ff6b6b] text-xs">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#c8f560] text-black font-bold py-3 rounded-xl hover:bg-[#d4f77a] transition-colors disabled:opacity-50"
        >
          {loading ? "creating..." : "create group"}
        </button>
      </main>
    </div>
  );
}
