"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type Balance = {
  userId: string;
  name: string;
  amount: number;
};

type Member = {
  userId: string;
  is_admin: boolean;
  user: { id: string; name: string; avatar_url: string | null };
};

type Group = {
  id: string;
  name: string;
  is_one_on_one: boolean;
  members: Member[];
};

type Props = {
  balances: Balance[];
  groups: Group[];
  currentUserId: string;
};

export default function DashboardClient({ balances, groups, currentUserId }: Props) {
  const owesMe = balances.filter((b) => b.amount > 0);
  const iOwe = balances.filter((b) => b.amount < 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {balances.length === 0 && (
            <p className="text-sm text-muted-foreground">No outstanding balances.</p>
          )}
          {owesMe.map((b) => (
            <div key={b.userId} className="flex justify-between items-center py-1 border-b last:border-0">
              <span className="text-sm">{b.name}</span>
              <span className="text-green-600 font-semibold text-sm">
                owes you ₹{b.amount.toFixed(2)}
              </span>
            </div>
          ))}
          {iOwe.map((b) => (
            <div key={b.userId} className="flex justify-between items-center py-1 border-b last:border-0">
              <span className="text-sm">{b.name}</span>
              <span className="text-red-500 font-semibold text-sm">
                you owe ₹{Math.abs(b.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">No groups yet.</p>
          )}
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`}>
              <div className="flex items-center justify-between py-2 border-b last:border-0 hover:opacity-80 cursor-pointer">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                    ${g.is_one_on_one ? "bg-purple-500" : "bg-orange-500"}`}
                  >
                    {g.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{g.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {g.members.length} members
                </span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

