"use client";

import { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type User = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type Split = {
  id: string;
  userId: string;
  amount: string | number;
  user: User;
};

type Message = {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  user: User;
};

type Expense = {
  id: string;
  title: string;
  amount: string | number;
  split_type: string;
  payer: User;
  splits: Split[];
  messages: Message[];
};

type Props = {
  expense: Expense;
  currentUserId: string;
};

export default function ExpenseDetailClient({ expense, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>(expense.messages);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!pusherKey || !pusherCluster) return;

    const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
    const channel = pusher.subscribe(`expense-${expense.id}`);
    channel.bind("new-message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });
    return () => {
      channel.unbind_all();
      pusher.disconnect();
    };
  }, [expense.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const content = newMsg.trim();
    if (!content) return;
    setSending(true);
    try {
      await fetch(`/api/expenses/${expense.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setNewMsg("");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{expense.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Paid by {expense.payer.name} · ₹{Number(expense.amount).toFixed(2)} · {expense.split_type}
          </p>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 font-medium">Person</th>
                <th className="text-right py-1 font-medium">Owes</th>
              </tr>
            </thead>
            <tbody>
              {expense.splits.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2">{s.user.name}</td>
                  <td className="py-2 text-right">₹{Number(s.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Comments</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="h-64 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
            )}
            {messages.map((m) => {
              const isMe = m.userId === currentUserId;
              return (
                <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="text-xs">{m.user?.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className={`rounded-lg px-3 py-2 text-sm max-w-xs break-words
                    ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.content}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <Button onClick={sendMessage} disabled={sending}>
              {sending ? "..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

