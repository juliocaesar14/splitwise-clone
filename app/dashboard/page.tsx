"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Balance {
  userId: string;
  name: string;
  amount: number;
}

interface GroupBalance {
  groupId: string;
  groupName: string;
  netAmount: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [groupBalances, setGroupBalances] = useState<GroupBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    async function fetchData() {
      try {
        const res = await fetch("/api/users/me/balances");
        const data = await res.json();
        setBalances(Array.isArray(data) ? data : []);

        const groupRes = await fetch("/api/groups");
        const groups = await groupRes.json();
        if (!Array.isArray(groups)) return;

        const groupBalancePromises = groups.map(async (g: { id: string; name: string }) => {
          const bRes = await fetch(`/api/groups/${g.id}/balances`);
          const bData = await bRes.json();
          const userId = session?.user?.id;
          const myBalances = bData[userId as string] ?? {};
          const net = Object.values(myBalances as Record<string, number>).reduce(
            (sum: number, v) => sum + (v as number), 0
          );
          return { groupId: g.id, groupName: g.name, netAmount: net };
        });

        const resolved = await Promise.all(groupBalancePromises);
        setGroupBalances(resolved.filter((g) => g.netAmount !== 0));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [status, session]);

  const totalOwedToYou = balances.filter((b) => b.amount > 0).reduce((s, b) => s + b.amount, 0);
  const totalYouOwe = balances.filter((b) => b.amount < 0).reduce((s, b) => s + b.amount, 0);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c8f560] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-mono">
      <header className="border-b border-[#1e1e1e] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#c8f560] rounded-sm flex items-center justify-center">
            <span className="text-black text-xs font-bold">S</span>
          </div>
          <span className="text-white font-bold tracking-tight">splitwise</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/groups")} className="text-[#666] hover:text-white text-sm transition-colors">groups</button>
          <button onClick={() => router.push("/settings")} className="text-[#666] hover:text-white text-sm transition-colors">settings</button>
          <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2e2e2e] flex items-center justify-center text-xs text-[#999]">
            {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0d1a00] border border-[#1a3300] rounded-xl p-5">
            <p className="text-[#4a7a00] text-xs uppercase tracking-widest mb-2">owed to you</p>
            <p className="text-[#c8f560] text-3xl font-bold">₹{totalOwedToYou.toFixed(2)}</p>
          </div>
          <div className="bg-[#1a0000] border border-[#330000] rounded-xl p-5">
            <p className="text-[#7a0000] text-xs uppercase tracking-widest mb-2">you owe</p>
            <p className="text-[#ff6b6b] text-3xl font-bold">₹{Math.abs(totalYouOwe).toFixed(2)}</p>
          </div>
        </div>

        <section>
          <div className="flex items-center mb-4">
            <h2 className="text-[#666] text-xs uppercase tracking-widest">people</h2>
            <div className="h-px flex-1 ml-4 bg-[#1e1e1e]" />
          </div>
          {balances.length === 0 ? (
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-8 text-center">
              <p className="text-[#444] text-sm">no balances yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {balances.map((b) => (
                <div key={b.userId} className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-5 py-4 flex items-center justify-between hover:border-[#2e2e2e] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2e2e2e] flex items-center justify-center text-xs text-[#999]">
                      {b.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm">{b.name}</p>
                      <p className="text-[#555] text-xs">{b.amount > 0 ? "owes you" : "you owe"}</p>
                    </div>
                  </div>
                  <span className={`text-base font-bold ${b.amount > 0 ? "text-[#c8f560]" : "text-[#ff6b6b]"}`}>
                    {b.amount > 0 ? "+" : "-"}₹{Math.abs(b.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center mb-4">
            <h2 className="text-[#666] text-xs uppercase tracking-widest">groups</h2>
            <div className="h-px flex-1 ml-4 bg-[#1e1e1e]" />
          </div>
          {groupBalances.length === 0 ? (
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-8 text-center">
              <p className="text-[#444] text-sm">no group balances</p>
              <button onClick={() => router.push("/groups/new")} className="mt-3 text-[#c8f560] text-xs hover:underline">create a group →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {groupBalances.map((g) => (
                <div key={g.groupId} onClick={() => router.push(`/groups/${g.groupId}`)} className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-5 py-4 flex items-center justify-between hover:border-[#2e2e2e] cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1a1a2e] border border-[#2e2e4e] flex items-center justify-center text-xs text-[#8888cc]">
                      {g.groupName[0]?.toUpperCase()}
                    </div>
                    <p className="text-white text-sm">{g.groupName}</p>
                  </div>
                  <span className={`text-base font-bold ${g.netAmount > 0 ? "text-[#c8f560]" : "text-[#ff6b6b]"}`}>
                    {g.netAmount > 0 ? "+" : "-"}₹{Math.abs(g.netAmount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <button onClick={() => router.push("/groups")} className="fixed bottom-8 right-8 bg-[#c8f560] text-black font-bold text-sm px-5 py-3 rounded-full shadow-lg hover:bg-[#d4f77a] transition-colors">
        + new expense
      </button>
    </div>
  );
}

