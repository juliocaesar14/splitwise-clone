import { Decimal } from "@prisma/client/runtime/library";

export type Debt = {
  from: string; // userId who owes
  to: string;   // userId who is owed
  amount: Decimal;
};

export function simplifyDebts(debts: Debt[]): Debt[] {
  // Build net balance map for each person
  const netBalance = new Map<string, Decimal>();

  for (const debt of debts) {
    // 'from' loses money
    const fromBalance = netBalance.get(debt.from) ?? new Decimal(0);
    netBalance.set(debt.from, fromBalance.minus(debt.amount));

    // 'to' gains money
    const toBalance = netBalance.get(debt.to) ?? new Decimal(0);
    netBalance.set(debt.to, toBalance.plus(debt.amount));
  }

  // Separate into people who owe (negative) and people who are owed (positive)
  const owes: { userId: string; amount: Decimal }[] = [];
  const owed: { userId: string; amount: Decimal }[] = [];

  for (const [userId, balance] of netBalance.entries()) {
    if (balance.lessThan(0)) {
      owes.push({ userId, amount: balance.abs() });
    } else if (balance.greaterThan(0)) {
      owed.push({ userId, amount: balance });
    }
  }

  // Greedy matching algorithm — minimize number of transactions
  const result: Debt[] = [];
  let i = 0;
  let j = 0;

  while (i < owes.length && j < owed.length) {
    const oweAmount = owes[i].amount;
    const owedAmount = owed[j].amount;
    const minAmount = Decimal.min(oweAmount, owedAmount);

    result.push({
      from: owes[i].userId,
      to: owed[j].userId,
      amount: minAmount,
    });

    owes[i].amount = oweAmount.minus(minAmount);
    owed[j].amount = owedAmount.minus(minAmount);

    if (owes[i].amount.equals(0)) i++;
    if (owed[j].amount.equals(0)) j++;
  }

  return result;
}

