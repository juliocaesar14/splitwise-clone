"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Pusher from "pusher-js";

interface Split { id: string; amount: string; user: { id: string; name: string } }
interface Message { id: string; content: string; createdAt: string; user: { id: string; name: string } }
interface Expense {
  id: string; title: string; amount: string; createdAt: string;
  split_type: string;
  payer: { id: string; name: string };
  splits: Split[];
  messages: Message[];
}

export default function ExpenseDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ Track message IDs we already have so Pusher can't add duplicates
  const seenIds = useRef<Set<string>>(new Set());

  const addMessage = (m: Message) => {
    if (seenIds.current.has(m.id)) return;
    seenIds.current.add(m.id);
    setMessages((prev) => [...prev, m]);
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/expenses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setExpense(data);
        const initial: Message[] = data.messages ?? [];
        initial.forEach((m) => seenIds.current.add(m.id));
        setMessages(initial);
      });
  }, [status, id]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe(`expense-${id}`);
    channel.bind("new-message", (data: Message) => {
      addMessage(data);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`expense-${id}`);
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const content = newMessage;
    setNewMessage("");

    try {
      const res = await fetch(`/api/expenses/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Failed to send");

      const saved: Message = await res.json();
      addMessage(saved);
    } catch {
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c8f560] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-mono flex flex-col">
      <header className="border-b border-[#1e1e1e] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <button onClick={() => router.back()} className="text-[#666] hover:text-white text-sm transition-colors">← back</button>
        <span className="text-white font-bold tracking-tight">{expense.title}</span>
        <div className="w-16" />
      </header>

      <div className="max-w-3xl mx-auto w-full px-6 py-8 flex flex-col gap-8 flex-1">
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white text-xl font-bold">₹{parseFloat(expense.amount).toFixed(2)}</p>
              <p className="text-[#555] text-xs mt-1">paid by {expense.payer.name} · {expense.split_type.toLowerCase()}</p>
            </div>
            <p className="text-[#444] text-xs">{new Date(expense.createdAt).toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        <section>
          <div className="flex items-center mb-3">
            <h2 className="text-[#666] text-xs uppercase tracking-widest">split breakdown</h2>
            <div className="h-px flex-1 ml-4 bg-[#1e1e1e]" />
          </div>
          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl overflow-hidden">
            {expense.splits.map((s, i) => (
              <div key={s.id} className={`flex items-center justify-between px-5 py-3 ${i !== expense.splits.length - 1 ? "border-b border-[#1e1e1e]" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#2e2e2e] flex items-center justify-center text-[10px] text-[#999]">
                    {s.user.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-white">{s.user.name}</span>
                  {s.user.id === session?.user?.id && <span className="text-[#555] text-[10px]">(you)</span>}
                </div>
                <span className="text-sm font-bold text-white">₹{parseFloat(s.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col flex-1">
          <div className="flex items-center mb-3">
            <h2 className="text-[#666] text-xs uppercase tracking-widest">chat</h2>
            <div className="h-px flex-1 ml-4 bg-[#1e1e1e]" />
          </div>

          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-4 space-y-3 min-h-[200px] max-h-[300px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-[#444] text-xs text-center mt-8">no messages yet</p>
            ) : (
              messages.map((m) => {
                const isMe = m.user.id === session?.user?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${isMe ? "bg-[#1a3300] text-[#c8f560]" : "bg-[#1e1e1e] text-white"}`}>
                      {!isMe && <p className="text-[#555] text-[10px] mb-1">{m.user.name}</p>}
                      <p>{m.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2 mt-3">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="type a message..."
              className="flex-1 bg-[#141414] border border-[#1e1e1e] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#c8f560] transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="bg-[#c8f560] text-black font-bold px-4 py-2.5 rounded-xl hover:bg-[#d4f77a] transition-colors disabled:opacity-50 text-sm"
            >
              {sending ? "..." : "send"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}