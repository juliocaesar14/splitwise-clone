"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type SplitType = "EQUAL" | "UNEQUAL" | "PERCENTAGE" | "SHARE";
interface Member { userId: string; user: { id: string; name: string } }
interface SplitEntry { userId: string; name: string; amount: number; percentage: number; shares: number }

export default function NewExpensePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [splits, setSplits] = useState<SplitEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/groups/${id}/members`)
      .then((r) => r.json())
      .then((data: Member[]) => {
        // Deduplicate members by userId
        const unique = data.filter((m, i, arr) =>
          arr.findIndex(x => x.userId === m.userId) === i
        );
        setMembers(unique);
        setPayerId(session?.user?.id ?? "");
        setSplits(unique.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          amount: 0,
          percentage: 100 / unique.length,
          shares: 1,
        })));
      });
  }, [status, id, session]);

  const total = parseFloat(totalAmount) || 0;

  const pieData = splitType === "PERCENTAGE"
    ? splits.map((s) => ({ name: s.name, value: s.percentage }))
    : splits.map((s) => ({ name: s.name, value: s.amount || total / splits.length }));

  const COLORS = ["#c8f560", "#60a5fa", "#f472b6", "#fb923c", "#a78bfa", "#34d399"];

  function updateSplit(userId: string, field: keyof SplitEntry, value: number) {
    setSplits((prev) => prev.map((s) => s.userId === userId ? { ...s, [field]: value } : s));
  }

  async function handleSubmit() {
    if (!title.trim()) return setError("title is required");
    if (!total || total <= 0) return setError("enter a valid amount");
    if (!payerId) return setError("select a payer");

    setLoading(true);
    setError("");

    const payload = {
      title,
      totalAmount: total,
      payerId,
      splitType,
      splits: splits.map((s) => ({
        userId: s.userId,
        amount: splitType === "UNEQUAL" ? s.amount : undefined,
        percentage: splitType === "PERCENTAGE" ? s.percentage : undefined,
        shares: splitType === "SHARE" ? s.shares : undefined,
      })),
    };

    try {
      const res = await fetch(`/api/groups/${id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return setError(typeof data.error === "string" ? data.error : "invalid splits");
      router.push(`/groups/${id}`);
    } catch {
      setError("something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-mono">
      <header className="border-b border-[#1e1e1e] px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-[#666] hover:text-white text-sm transition-colors">← back</button>
        <span className="text-white font-bold tracking-tight">add expense</span>
        <div className="w-16" />
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-6">
        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="dinner, groceries..." className="w-full bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8f560] transition-colors" />
        </div>

        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">total amount *</label>
          <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8f560] transition-colors" />
        </div>

        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">paid by *</label>
          <select value={payerId} onChange={(e) => setPayerId(e.target.value)} className="w-full bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#c8f560] transition-colors">
            {members.map((m) => (
              <option key={`payer-${m.userId}`} value={m.userId}>
                {m.user.name}{m.userId === session?.user?.id ? " (you)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[#666] text-xs uppercase tracking-widest">split type</label>
          <div className="grid grid-cols-4 gap-2">
            {(["EQUAL", "UNEQUAL", "PERCENTAGE", "SHARE"] as SplitType[]).map((t) => (
              <button key={`split-type-${t}`} onClick={() => setSplitType(t)} className={`py-2 rounded-lg text-xs font-medium transition-colors ${splitType === t ? "bg-[#c8f560] text-black" : "bg-[#141414] border border-[#1e1e1e] text-[#666] hover:text-white"}`}>
                {t.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {splitType === "PERCENTAGE" && total > 0 && (
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={`pie-cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: "#1e1e1e", border: "none", borderRadius: 8, color: "white", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {splitType !== "EQUAL" && (
          <div className="space-y-2">
            <label className="text-[#666] text-xs uppercase tracking-widest">
              {splitType === "UNEQUAL" ? "amounts" : splitType === "PERCENTAGE" ? "percentages" : "shares"}
            </label>
            {splits.map((s) => (
              <div key={`split-input-${s.userId}`} className="flex items-center gap-3 bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3">
                <span className="text-sm text-white flex-1">{s.name}</span>
                <input
                  type="number"
                  value={splitType === "UNEQUAL" ? s.amount : splitType === "PERCENTAGE" ? s.percentage : s.shares}
                  onChange={(e) => updateSplit(s.userId, splitType === "UNEQUAL" ? "amount" : splitType === "PERCENTAGE" ? "percentage" : "shares", parseFloat(e.target.value) || 0)}
                  className="w-24 bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-1.5 text-white text-sm text-right focus:outline-none focus:border-[#c8f560]"
                />
                <span className="text-[#555] text-xs w-4">{splitType === "PERCENTAGE" ? "%" : splitType === "UNEQUAL" ? "₹" : "x"}</span>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-[#ff6b6b] text-xs">{error}</p>}

        <button onClick={handleSubmit} disabled={loading} className="w-full bg-[#c8f560] text-black font-bold py-3 rounded-xl hover:bg-[#d4f77a] transition-colors disabled:opacity-50">
          {loading ? "saving..." : "add expense"}
        </button>
      </main>
    </div>
  );
}