"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
  description?: string;
  currency: string;
  createdAt: string;
  members: { userId: string; is_admin: boolean; user: { name: string; avatar_url?: string } }[];
  _count: { expenses: number };
}

export default function GroupsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [status]);

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
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-[#666] hover:text-white text-sm transition-colors">← dashboard</button>
        </div>
        <span className="text-white font-bold tracking-tight">groups</span>
        <button onClick={() => router.push("/groups/new")} className="bg-[#c8f560] text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#d4f77a] transition-colors">
          + new
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {groups.length === 0 ? (
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-12 text-center">
            <p className="text-[#444] text-sm mb-2">no groups yet</p>
            <button onClick={() => router.push("/groups/new")} className="text-[#c8f560] text-sm hover:underline">create your first group →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const is1on1 = g.members.length === 2;
              return (
                <div key={g.id} onClick={() => router.push(`/groups/${g.id}`)} className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-5 py-4 flex items-center justify-between hover:border-[#2e2e2e] cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${is1on1 ? "bg-[#1a1a2e] border border-[#2e2e4e] text-[#8888cc]" : "bg-[#1a2e1a] border border-[#2e4e2e] text-[#88cc88]"}`}>
                      {g.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium">{g.name}</p>
                        {is1on1 && <span className="text-[#555] text-[10px] border border-[#2e2e4e] rounded px-1.5 py-0.5 text-[#8888cc]">1-on-1</span>}
                      </div>
                      <p className="text-[#555] text-xs">{g.members.length} members · {g._count.expenses} expenses</p>
                    </div>
                  </div>
                  <span className="text-[#444] text-xs">{g.currency} →</span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}