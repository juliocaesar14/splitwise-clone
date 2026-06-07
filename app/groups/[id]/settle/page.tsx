"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface DebtEntry { from: string; fromName: string; to: string; toName: string; amount: number; toUpiId?: string }

export default function SettleUpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    async function load() {
      const [balRes, memberRes] = await Promise.all([
        fetch(`/api/groups/${id}/balances`),
        fetch(`/api/groups/${id}/members`),
      ]);
      const balances = await balRes.json();
      const members = await memberRes.json();

      const nameMap: Record<string, string> = {};
      const upiMap: Record<string, string> = {};
      members.forEach((m: any) => {
        nameMap[m.userId] = m.user.name;
        if (m.user.upiId) upiMap[m.userId] = m.user.upiId;
      });

      const result: DebtEntry[] = [];
      for (const [fromId, targets] of Object.entries(balances as Record<string, Record<string, number>>)) {
        for (const [toId, amount] of Object.entries(targets)) {
          if (amount < 0) {
            result.push({
              from: fromId,
              fromName: nameMap[fromId] ?? fromId,
              to: toId,
              toName: nameMap[toId] ?? toId,
              amount: Math.abs(amount),
              toUpiId: upiMap[toId],
            });
          }
        }
      }
      setDebts(result);
      setLoading(false);
    }
    load();
  }, [status, id]);

  async function markAsPaid(debt: DebtEntry) {
    setSettling(`${debt.from}-${debt.to}`);
    try {
      await fetch(`/api/groups/${id}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payerId: debt.from, receiverId: debt.to, amount: debt.amount }),
      });
      setDebts((prev) => prev.filter((d) => !(d.from === debt.from && d.to === debt.to)));
    } finally {
      setSettling(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c8f560] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-mono">
      <header className="border-b border-[#1e1e1e] px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-[#666] hover:text-white text-sm transition-colors">← back</button>
        <span className="text-white font-bold tracking-tight">settle up</span>
        <div className="w-16" />
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        {debts.length === 0 ? (
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-12 text-center">
            <p className="text-[#c8f560] text-2xl mb-2">✓</p>
            <p className="text-white text-sm">all settled up!</p>
            <p className="text-[#444] text-xs mt-1">no outstanding balances</p>
          </div>
        ) : (
          <div className="space-y-3">
            {debts.map((d) => {
              const key = `${d.from}-${d.to}`;
              const isMe = d.from === session?.user?.id;
              return (
                <div key={key} className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">
                        <span className={isMe ? "text-[#ff6b6b]" : "text-white"}>{d.fromName}</span>
                        <span className="text-[#444] mx-2">owes</span>
                        <span className={!isMe ? "text-[#c8f560]" : "text-white"}>{d.toName}</span>
                      </p>
                    </div>
                    <p className="text-white font-bold">₹{d.amount.toFixed(2)}</p>
                  </div>

                  {isMe && (
                    <div className="flex gap-2">
                      {d.toUpiId && (
                        <Link
                          href={`upi://pay?pa=${d.toUpiId}&am=${d.amount.toFixed(2)}&cu=INR&tn=Splitwise+settlement`}
                          className="flex-1 bg-[#1a3300] border border-[#2a5500] text-[#c8f560] text-xs font-bold py-2 rounded-lg text-center hover:bg-[#243300] transition-colors"
                        >
                          pay via UPI
                        </Link>
                      )}
                      <button
                        onClick={() => markAsPaid(d)}
                        disabled={settling === key}
                        className="flex-1 bg-[#1e1e1e] border border-[#2e2e2e] text-white text-xs font-bold py-2 rounded-lg hover:border-[#c8f560] hover:text-[#c8f560] transition-colors disabled:opacity-50"
                      >
                        {settling === key ? "marking..." : "mark as paid"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

