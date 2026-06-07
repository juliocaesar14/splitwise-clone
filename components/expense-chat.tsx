"use client";

import { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";
import { Send, MessageCircle } from "lucide-react";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
};

export default function ExpenseChat({
  expenseId,
  currentUserId,
  currentUserName,
  initialMessages,
}: {
  expenseId: string;
  currentUserId: string;
  currentUserName: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to Pusher channel
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`expense-${expenseId}`);

    channel.bind("new-message", (data: Message) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`expense-${expenseId}`);
    };
  }, [expenseId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      await fetch(`/api/expenses/${expenseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      setText("");
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b">
        <MessageCircle className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">Comments</h2>
        <span className="text-xs text-gray-400 ml-auto">live</span>
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-300 pt-8">
            No comments yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user.id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
              >
                <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 shrink-0">
                  {msg.user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className={`max-w-xs ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  {!isMe && (
                    <p className="text-xs text-gray-400 mb-0.5">{msg.user.name}</p>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm
                      ${isMe
                        ? "bg-emerald-600 text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                      }`}
                  >
                    {msg.content}
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex items-center gap-2 px-4 py-3 border-t"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 text-sm border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

