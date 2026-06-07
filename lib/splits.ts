import { Decimal } from "@prisma/client/runtime/library";

// ─── Types ───────────────────────────────────────────────
export type SplitResult = {
  userId: string;
  amount: Decimal;
};

// ─── 1. Split Equally ────────────────────────────────────
export function splitEqually(
  totalAmount: Decimal,
  userIds: string[]
): SplitResult[] {
  const total = new Decimal(totalAmount);
  const count = userIds.length;
  const baseAmount = total.dividedBy(count).toDecimalPlaces(2);
  const distributed = baseAmount.times(count);
  const remainder = total.minus(distributed);

  return userIds.map((userId, index) => ({
    userId,
    // Give the remainder cent to the first person
    amount: index === 0 ? baseAmount.plus(remainder) : baseAmount,
  }));
}

// ─── 2. Validate Unequal Split ───────────────────────────
export function validateUnequal(
  totalAmount: Decimal,
  splits: SplitResult[]
): boolean {
  const sum = splits.reduce(
    (acc, s) => acc.plus(new Decimal(s.amount)),
    new Decimal(0)
  );
  return sum.equals(new Decimal(totalAmount));
}

// ─── 3. Validate Percentage Split ───────────────────────
export function validatePercentage(percentages: number[]): boolean {
  const sum = percentages.reduce((acc, p) => acc + p, 0);
  return Math.abs(sum - 100) < 0.01; // allow tiny floating point errors
}

export function splitByPercentage(
  totalAmount: Decimal,
  userPercentages: { userId: string; percentage: number }[]
): SplitResult[] {
  const total = new Decimal(totalAmount);

  const results = userPercentages.map(({ userId, percentage }) => ({
    userId,
    amount: total.times(percentage).dividedBy(100).toDecimalPlaces(2),
  }));

  // Fix rounding: adjust first person for any remainder
  const distributedSum = results.reduce(
    (acc, r) => acc.plus(r.amount),
    new Decimal(0)
  );
  const remainder = total.minus(distributedSum);
  results[0].amount = results[0].amount.plus(remainder);

  return results;
}

// ─── 4. Split by Shares ──────────────────────────────────
export function splitByShares(
  totalAmount: Decimal,
  userShares: { userId: string; shares: number }[]
): SplitResult[] {
  const total = new Decimal(totalAmount);
  const totalShares = userShares.reduce((acc, u) => acc + u.shares, 0);

  const results = userShares.map(({ userId, shares }) => ({
    userId,
    amount: total.times(shares).dividedBy(totalShares).toDecimalPlaces(2),
  }));

  // Fix rounding remainder
  const distributedSum = results.reduce(
    (acc, r) => acc.plus(r.amount),
    new Decimal(0)
  );
  const remainder = total.minus(distributedSum);
  results[0].amount = results[0].amount.plus(remainder);

  return results;
}