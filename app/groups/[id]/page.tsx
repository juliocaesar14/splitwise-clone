"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";

interface Member { userId: string; is_admin: boolean; user: { id: string; name: string; email: string } }
interface Expense { id: string; title: string; amount: string; createdAt: string; split_type: string; payer: { name: string } }
interface Group { id: string; name: string; description?: string; currency: string; members: Member[]; expenses: Expense[] }

export default function GroupDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [view, setView] = useState<"chronological" | "grouped">("chronological");
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchGroup();
  }, [status, id]);

  function fetchGroup() {
    setLoading(true);
    fetch(`/api/groups/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object" && !data.error) {
          data.expenses = Array.isArray(data.expenses) ? data.expenses : [];
          data.members = Array.isArray(data.members) ? data.members : [];
          setGroup(data);
        }
      })
      .finally(() => setLoading(false));
  }

  async function searchUsers(q: string) {
    setSearchQuery(q);
    if (q.length < 3) { setSearchResults([]); return; }
    const res = await fetch(`/api/users/search?q=${q}`);
    const data = await res.json();
    // ✅ Filter out users already in the group
    const memberIds = new Set(group?.members.map((m) => m.userId) ?? []);
    setSearchResults(Array.isArray(data) ? data.filter((u: any) => !memberIds.has(u.id)) : []);
  }

  async function addMember(userId: string) {
    setAddingMember(true);
    const res = await fetch(`/api/groups/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to add member");
    }
    setAddingMember(false);
    setShowAddMember(false);
    setSearchQuery("");
    setSearchResults([]);
    fetchGroup();
  }

  // ✅ NEW: Remove member
  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the group?")) return;
    setRemovingId(userId);
    await fetch(`/api/groups/${id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setRemovingId(null);
    fetchGroup();
  }

  if (loading || !group) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c8f560] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const expenses = group.expenses ?? [];
  const currentUserId = (session?.user as any)?.id;
  const currentMember = group.members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.is_admin ?? false;

  const groupedExpenses = expenses.reduce((acc, e) => {
    const date = new Date(e.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(e);
    return acc;
  }, {} as Record<string, Expense[]>);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-mono">
      <header className="border-b border-[#1e1e1e] px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.push("/groups")} className="text-[#666] hover:text-white text-sm transition-colors">← groups</button>
        <span className="text-white font-bold tracking-tight">{group.name}</span>
        <button onClick={() => router.push(`/groups/${id}/settle`)} className="text-[#c8f560] text-xs border border-[#2a3a00] px-3 py-1.5 rounded-lg hover:bg-[#1a2a00] transition-colors">
          settle up
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <h2 className="text-[#666] text-xs uppercase tracking-widest">members</h2>
              <div className="h-px w-8 ml-4 bg-[#1e1e1e]" />
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="text-xs text-[#c8f560] border border-[#2a3a00] px-3 py-1.5 rounded-lg hover:bg-[#1a2a00] transition-colors"
              >
                + add member
              </button>
            )}
          </div>

          {showAddMember && (
            <div className="mb-4 bg-[#141414] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
              <input
                type="text"
                placeholder="search by name or email (min 3 chars)..."
                value={searchQuery}
                onChange={(e) => searchUsers(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg px-3 py-2 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8f560]"
              />
              {searchResults.length === 0 && searchQuery.length >= 3 && (
                <p className="text-[#555] text-xs">no users found</p>
              )}
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{u.name}</p>
                    <p className="text-xs text-[#555]">{u.email}</p>
                  </div>
                  <button
                    onClick={() => addMember(u.id)}
                    disabled={addingMember}
                    className="text-xs bg-[#c8f560] text-black px-3 py-1.5 rounded-lg font-bold disabled:opacity-50"
                  >
                    {addingMember ? "adding..." : "add"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ✅ Members list with remove button */}
          <div className="space-y-2">
            {group.members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#2e2e2e] flex items-center justify-center text-xs text-[#999]">
                    {m.user.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-white">{m.user.name}
                      {m.userId === currentUserId && <span className="text-[#555] text-[10px] ml-1">(you)</span>}
                    </p>
                    <p className="text-[#555] text-xs">{m.user.email}</p>
                  </div>
                  {m.is_admin && <span className="text-[10px] text-[#c8f560] border border-[#2a3a00] px-1.5 py-0.5 rounded">admin</span>}
                </div>
                {/* ✅ Only admin can remove, can't remove yourself */}
                {isAdmin && m.userId !== currentUserId && (
                  <button
                    onClick={() => removeMember(m.userId)}
                    disabled={removingId === m.userId}
                    className="text-xs text-[#ff6b6b] border border-[#330000] px-2 py-1 rounded-lg hover:bg-[#1a0000] transition-colors disabled:opacity-50"
                  >
                    {removingId === m.userId ? "..." : "remove"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h2 className="text-[#666] text-xs uppercase tracking-widest">expenses</h2>
              <div className="h-px w-8 ml-4 bg-[#1e1e1e]" />
            </div>
            <div className="flex bg-[#141414] border border-[#1e1e1e] rounded-lg p-1 gap-1">
              <button onClick={() => setView("chronological")} className={`text-xs px-3 py-1 rounded-md transition-colors ${view === "chronological" ? "bg-[#2e2e2e] text-white" : "text-[#666] hover:text-white"}`}>
                list
              </button>
              <button onClick={() => setView("grouped")} className={`text-xs px-3 py-1 rounded-md transition-colors ${view === "grouped" ? "bg-[#2e2e2e] text-white" : "text-[#666] hover:text-white"}`}>
                by month
              </button>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-8 text-center">
              <p className="text-[#444] text-sm">no expenses yet</p>
            </div>
          ) : view === "chronological" ? (
            <div className="space-y-2">
              {expenses.map((e) => (
                <ExpenseRow key={e.id} expense={e} onClick={() => router.push(`/expenses/${e.id}`)} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedExpenses).map(([month, exps]) => (
                <div key={month}>
                  <p className="text-[#555] text-xs mb-2">{month}</p>
                  <div className="space-y-2">
                    {exps.map((e) => (
                      <ExpenseRow key={e.id} expense={e} onClick={() => router.push(`/expenses/${e.id}`)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <button
        onClick={() => router.push(`/groups/${id}/expenses/new`)}
        className="fixed bottom-8 right-8 bg-[#c8f560] text-black font-bold text-sm px-5 py-3 rounded-full shadow-lg hover:bg-[#d4f77a] transition-colors"
      >
        + add expense
      </button>
    </div>
  );
}

function ExpenseRow({ expense, onClick }: { expense: any; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-5 py-4 flex items-center justify-between hover:border-[#2e2e2e] cursor-pointer transition-colors">
      <div>
        <p className="text-white text-sm">{expense.title}</p>
        <p className="text-[#555] text-xs">paid by {expense.payer?.name ?? "unknown"} · {expense.split_type?.toLowerCase()}</p>
      </div>
      <p className="text-white text-sm font-bold">₹{parseFloat(expense.amount).toFixed(2)}</p>
    </div>
  );
}