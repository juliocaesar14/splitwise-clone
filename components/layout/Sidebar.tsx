"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/groups", label: "Groups", icon: "👥" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-card flex flex-col py-6 px-3 gap-1 shrink-0">
      <div className="px-3 mb-6">
        <h2 className="text-lg font-bold text-primary">Splitwise</h2>
        <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
      </div>
      {links.map((l) => (
        <Link key={l.href} href={l.href}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
            ${pathname.startsWith(l.href) ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </div>
        </Link>
      ))}
      <div className="mt-auto">
        <Button variant="ghost" size="sm" className="w-full" onClick={() => signOut({ callbackUrl: "/" })}>
          Sign out
        </Button>
      </div>
    </aside>
  );
}

