"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type User = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type Member = {
  userId: string;
  is_admin: boolean;
  user: User;
};

type Split = {
  id: string;
  userId: string;
  amount: string | number;
  user: User;
};

type Expense = {
  id: string;
  title: string;
  amount: string | number;
  split_type: string;
  createdAt: string;
  payer: User;
  splits: Split[];
};

type Group = {
  id: string;
  name: string;
  is_one_on_one: boolean;
  members: Member[];
  expenses: Expense[];
};

type Debt = {
  fromId: string;
  toId: string;
  amount: number;
};

type Props = {
  group: Group;
  debts: Debt[];
  currentUserId: string;
};

export default function GroupDetailClient({ group, debts, currentUserId }: Props) {
  const [view, setView] = useState<"chrono" | "grouped">("chrono");

  const byDate: Record<string, Expense[]> = {};
  for (const exp of group.expenses) {
    const date = new Date(exp.createdAt).toLocaleDateString("en-IN");
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(exp);
  }

  const memberMap: Record<string, string> = {};
  for (const m of group.members) {
    memberMap[m.userId] = m.user.name;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">{group.members.length} members</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/groups/${group.id}/settle`}>
            <Button variant="outline">Settle Up</Button>
          </Link>
          <Link href={`/groups/${group.id}/expenses/new`}>
            <Button>+ Add Expense</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {group.members.map((m) => (
          <div key={m.userId} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1 text-sm">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-xs">{m.user.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <span>{m.user.name}</span>
            {m.is_admin && <Badge className="ml-1 text-xs" variant="secondary">Admin</Badge>}
          </div>
        ))}
      </div>

      {debts.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-1">
            {debts.map((d, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{memberMap[d.fromId] ?? d.fromId} → {memberMap[d.toId] ?? d.toId}</span>
                <span className="font-semibold text-red-500">₹{d.amount.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant={view === "chrono" ? "default" : "outline"} onClick={() => setView("chrono")}>
          Chronological
        </Button>
        <Button size="sm" variant={view === "grouped" ? "default" : "outline"} onClick={() => setView("grouped")}>
          By Date
        </Button>
      </div>

      {view === "chrono" ? (
        <div className="space-y-2">
          {group.expenses.map((exp) => <ExpenseRow key={exp.id} exp={exp} groupId={group.id} />)}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, exps]) => (
            <div key={date}>
              <p className="text-sm font-semibold text-muted-foreground mb-2">{date}</p>
              <div className="space-y-2">
                {exps.map((exp) => <ExpenseRow key={exp.id} exp={exp} groupId={group.id} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpenseRow({ exp, groupId }: { exp: Expense; groupId: string }) {
  return (
    <Link href={`/expenses/${exp.id}`}>
      <Card className="hover:shadow-sm transition cursor-pointer mb-1">
        <CardContent className="flex justify-between items-center py-3">
          <div>
            <p className="font-medium">{exp.title}</p>
            <p className="text-xs text-muted-foreground">Paid by {exp.payer.name} · {exp.split_type}</p>
          </div>
          <span className="font-semibold">₹{Number(exp.amount).toFixed(2)}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

