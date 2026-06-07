import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

function toNumber(d: Decimal | number): number {
  return typeof d === "number" ? d : d.toNumber();
}

export async function calculateGroupBalances(groupId: string) {
  const splits = await prisma.expenseSplit.findMany({
    where: { expense: { groupId } },
    include: { expense: true },
  });

  const settlements = await prisma.settlement.findMany({ where: { groupId } });

  const balanceMap: Record<string, Record<string, number>> = {};

  const ensure = (a: string, b: string) => {
    if (!balanceMap[a]) balanceMap[a] = {};
    if (!balanceMap[a][b]) balanceMap[a][b] = 0;
  };

  for (const split of splits) {
    const payer = split.expense.payerId;
    const ower = split.userId;
    if (payer === ower) continue;
    ensure(payer, ower);
    ensure(ower, payer);
    balanceMap[payer][ower] += toNumber(split.amount);
    balanceMap[ower][payer] -= toNumber(split.amount);
  }

  for (const s of settlements) {
    ensure(s.payerId, s.receiverId);
    ensure(s.receiverId, s.payerId);
    balanceMap[s.payerId][s.receiverId] += toNumber(s.amount);
    balanceMap[s.receiverId][s.payerId] -= toNumber(s.amount);
  }

  return balanceMap;
}

export async function calculateGlobalBalances(userId: string) {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    select: { id: true },
  });

  const totals: Record<string, number> = {};

  for (const group of groups) {
    const map = await calculateGroupBalances(group.id);
    if (!map[userId]) continue;
    for (const [otherId, amount] of Object.entries(map[userId])) {
      totals[otherId] = (totals[otherId] ?? 0) + amount;
    }
  }

  const userIds = Object.keys(totals);
  if (userIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  return users.map((u) => ({
    userId: u.id,
    name: u.name ?? "Unknown",
    amount: totals[u.id] ?? 0,
  }));
}

