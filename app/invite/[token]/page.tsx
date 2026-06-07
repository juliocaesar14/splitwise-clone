"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";

interface InviteInfo {
  groupName:   string;
  currency:    string;
  memberCount: number;
  invitedBy:   string;
  expiresAt:   string;
}

async function safeFetch(url: string, options?: RequestInit) {
  const res  = await fetch(url, options);
  const text = await res.text();
  let data: any = null;
  if (text) { try { data = JSON.parse(text); } catch { data = { error: text }; } }
  return { ok: res.ok, status: res.status, data };
}

export default function InvitePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const token  = params.token as string;

  const [info,        setInfo]        = useState<InviteInfo | null>(null);
  const [infoError,   setInfoError]   = useState("");
  const [joining,     setJoining]     = useState(false);
  const [joinError,   setJoinError]   = useState("");
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    (async () => {
      const { ok, data } = await safeFetch(`/api/invite/${token}`);
      if (!ok) setInfoError(data?.error ?? "Invalid invite link");
      else     setInfo(data);
      setLoadingInfo(false);
    })();
  }, [token]);

  async function handleAccept() {
    if (status === "unauthenticated") {
      sessionStorage.setItem("pendingInviteToken", token);
      signIn(undefined, { callbackUrl: `/invite/${token}` });
      return;
    }

    setJoining(true);
    setJoinError("");

    const { ok, data } = await safeFetch(`/api/invite/${token}`, { method: "POST" });

    if (!ok) {
      setJoinError(data?.error ?? "Failed to join group");
      setJoining(false);
      return;
    }

    router.push(`/groups/${data.groupId}`);
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    const pending = sessionStorage.getItem("pendingInviteToken");
    if (pending && pending === token) {
      sessionStorage.removeItem("pendingInviteToken");
      handleAccept();
    }
  }, [status]);

  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c8f560] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (infoError) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <p className="text-4xl">🔗</p>
          <h1 className="text-white font-bold text-lg font-mono">invite invalid</h1>
          <p className="text-[#ff6b6b] text-sm font-mono">{infoError}</p>
          <button onClick={() => router.push("/")} className="text-xs text-[#666] hover:text-white transition-colors font-mono">
            go home →
          </button>
        </div>
      </div>
    );
  }

  const expiresDate = info ? new Date(info.expiresAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  }) : "";

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Hey! Join my group "${info?.groupName}" on Splitwise Clone: ${window.location.href}`
  )}`;

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-8 max-w-sm w-full space-y-6 font-mono">

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-[#1a2a00] border border-[#2a3a00] flex items-center justify-center text-2xl mx-auto">
            🎉
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight">you're invited</h1>
          <p className="text-[#555] text-xs">{info?.invitedBy} invited you to join</p>
        </div>

        <div className="bg-[#0f0f0f] border border-[#2e2e2e] rounded-xl px-5 py-4 space-y-1">
          <p className="text-[#c8f560] font-bold text-lg">{info?.groupName}</p>
          <p className="text-[#555] text-xs">
            {info?.memberCount} member{info?.memberCount !== 1 ? "s" : ""} · {info?.currency}
          </p>
        </div>

        <button
          onClick={handleAccept}
          disabled={joining}
          className="w-full bg-[#c8f560] text-black font-bold py-3 rounded-xl hover:bg-[#d4f77a] transition-colors disabled:opacity-50 text-sm"
        >
          {joining
            ? "joining..."
            : status === "unauthenticated"
            ? "sign in & join group"
            : "join group"}
        </button>

        {joinError && <p className="text-[#ff6b6b] text-xs text-center">{joinError}</p>}

        {status === "unauthenticated" && (
          <p className="text-[#444] text-xs text-center">
            you'll be asked to sign in or create an account first
          </p>
        )}

        <p className="text-[#333] text-[10px] text-center">link expires {expiresDate}</p>
      </div>
    </div>
  );
}