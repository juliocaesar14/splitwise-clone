/**
 * Unit Tests — Phase 7 Step 1
 * Run with: npx ts-node --skip-project test/run-tests.ts
 */

import { Decimal } from "@prisma/client/runtime/library";

// ─── Inline the functions so no import aliases needed ─────────────────────────

// splits
function splitEqually(totalAmount: Decimal, userIds: string[]) {
  const total = new Decimal(totalAmount);
  const count = userIds.length;
  const baseAmount = total.dividedBy(count).toDecimalPlaces(2);
  const distributed = baseAmount.times(count);
  const remainder = total.minus(distributed);
  return userIds.map((userId, index) => ({
    userId,
    amount: index === 0 ? baseAmount.plus(remainder) : baseAmount,
  }));
}

function validateUnequal(totalAmount: Decimal, splits: { userId: string; amount: Decimal }[]) {
  const sum = splits.reduce((acc, s) => acc.plus(new Decimal(s.amount)), new Decimal(0));
  return sum.equals(new Decimal(totalAmount));
}

function validatePercentage(percentages: number[]) {
  const sum = percentages.reduce((acc, p) => acc + p, 0);
  return Math.abs(sum - 100) < 0.01;
}

function splitByPercentage(totalAmount: Decimal, userPercentages: { userId: string; percentage: number }[]) {
  const total = new Decimal(totalAmount);
  const results = userPercentages.map(({ userId, percentage }) => ({
    userId,
    amount: total.times(percentage).dividedBy(100).toDecimalPlaces(2),
  }));
  const distributedSum = results.reduce((acc, r) => acc.plus(r.amount), new Decimal(0));
  results[0].amount = results[0].amount.plus(total.minus(distributedSum));
  return results;
}

function splitByShares(totalAmount: Decimal, userShares: { userId: string; shares: number }[]) {
  const total = new Decimal(totalAmount);
  const totalShares = userShares.reduce((acc, u) => acc + u.shares, 0);
  const results = userShares.map(({ userId, shares }) => ({
    userId,
    amount: total.times(shares).dividedBy(totalShares).toDecimalPlaces(2),
  }));
  const distributedSum = results.reduce((acc, r) => acc.plus(r.amount), new Decimal(0));
  results[0].amount = results[0].amount.plus(total.minus(distributedSum));
  return results;
}

// simplifyDebts
type Debt = { from: string; to: string; amount: Decimal };
function simplifyDebts(debts: Debt[]): Debt[] {
  const netBalance = new Map<string, Decimal>();
  for (const debt of debts) {
    netBalance.set(debt.from, (netBalance.get(debt.from) ?? new Decimal(0)).minus(debt.amount));
    netBalance.set(debt.to, (netBalance.get(debt.to) ?? new Decimal(0)).plus(debt.amount));
  }
  const owes: { userId: string; amount: Decimal }[] = [];
  const owed: { userId: string; amount: Decimal }[] = [];
  for (const [userId, balance] of netBalance.entries()) {
    if (balance.lessThan(0)) owes.push({ userId, amount: balance.abs() });
    else if (balance.greaterThan(0)) owed.push({ userId, amount: balance });
  }
  const result: Debt[] = [];
  let i = 0, j = 0;
  while (i < owes.length && j < owed.length) {
    const minAmount = Decimal.min(owes[i].amount, owed[j].amount);
    result.push({ from: owes[i].userId, to: owed[j].userId, amount: minAmount });
    owes[i].amount = owes[i].amount.minus(minAmount);
    owed[j].amount = owed[j].amount.minus(minAmount);
    if (owes[i].amount.equals(0)) i++;
    if (owed[j].amount.equals(0)) j++;
  }
  return result;
}

// ─── Test Runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${err.message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// ─── splits.ts Tests ──────────────────────────────────────────────────────────

console.log("\n📦 splits.ts\n");

test("splitEqually — divides evenly (3 people, ₹300)", () => {
  const results = splitEqually(new Decimal(300), ["u1", "u2", "u3"]);
  assert(results.length === 3, "should have 3 results");
  results.forEach((r) => assert(r.amount.toNumber() === 100, `expected 100 got ${r.amount}`));
});

test("splitEqually — handles remainder cent (₹100 / 3 people)", () => {
  const results = splitEqually(new Decimal(100), ["u1", "u2", "u3"]);
  const total = results.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));
  assert(total.toNumber() === 100, `total should be 100, got ${total}`);
  assert(results[0].amount.toNumber() === 33.34, `first should be 33.34, got ${results[0].amount}`);
  assert(results[1].amount.toNumber() === 33.33, `others should be 33.33, got ${results[1].amount}`);
});

test("splitEqually — single person gets full amount", () => {
  const results = splitEqually(new Decimal(500), ["u1"]);
  assert(results[0].amount.toNumber() === 500, `expected 500 got ${results[0].amount}`);
});

test("validateUnequal — true when splits sum to total", () => {
  const splits = [{ userId: "u1", amount: new Decimal(60) }, { userId: "u2", amount: new Decimal(40) }];
  assert(validateUnequal(new Decimal(100), splits) === true, "should be true");
});

test("validateUnequal — false when splits don't sum to total", () => {
  const splits = [{ userId: "u1", amount: new Decimal(60) }, { userId: "u2", amount: new Decimal(30) }];
  assert(validateUnequal(new Decimal(100), splits) === false, "should be false");
});

test("validatePercentage — true when percentages sum to 100", () => {
  assert(validatePercentage([50, 30, 20]) === true, "should be true");
});

test("validatePercentage — false when percentages don't sum to 100", () => {
  assert(validatePercentage([50, 30]) === false, "should be false");
});

test("validatePercentage — allows tiny floating point error", () => {
  assert(validatePercentage([33.33, 33.33, 33.34]) === true, "should be true");
});

test("splitByPercentage — amounts sum to total", () => {
  const results = splitByPercentage(new Decimal(200), [
    { userId: "u1", percentage: 50 },
    { userId: "u2", percentage: 30 },
    { userId: "u3", percentage: 20 },
  ]);
  const total = results.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));
  assert(total.toNumber() === 200, `total should be 200, got ${total}`);
});

test("splitByPercentage — no penny lost on tricky split", () => {
  const results = splitByPercentage(new Decimal(100), [
    { userId: "u1", percentage: 33.33 },
    { userId: "u2", percentage: 33.33 },
    { userId: "u3", percentage: 33.34 },
  ]);
  const total = results.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));
  assert(total.toNumber() === 100, `total should be 100, got ${total}`);
});

test("splitByShares — divides proportionally", () => {
  const results = splitByShares(new Decimal(300), [
    { userId: "u1", shares: 3 },
    { userId: "u2", shares: 1 },
    { userId: "u3", shares: 2 },
  ]);
  const total = results.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));
  assert(total.toNumber() === 300, `total should be 300, got ${total}`);
  const u2 = results.find((r) => r.userId === "u2")!;
  assert(u2.amount.toNumber() === 50, `u2 should get 50, got ${u2.amount}`);
});

test("splitByShares — no penny lost", () => {
  const results = splitByShares(new Decimal(100), [
    { userId: "u1", shares: 1 },
    { userId: "u2", shares: 1 },
    { userId: "u3", shares: 1 },
  ]);
  const total = results.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));
  assert(total.toNumber() === 100, `total should be 100, got ${total}`);
});

// ─── simplifyDebts.ts Tests ───────────────────────────────────────────────────

console.log("\n📦 simplifyDebts.ts\n");

test("simplifyDebts — simple A owes B", () => {
  const result = simplifyDebts([{ from: "A", to: "B", amount: new Decimal(100) }]);
  assert(result.length === 1, `expected 1 debt, got ${result.length}`);
  assert(result[0].from === "A" && result[0].to === "B", "wrong direction");
  assert(result[0].amount.toNumber() === 100, `expected 100, got ${result[0].amount}`);
});

test("simplifyDebts — cancels mutual debts (A owes B 100, B owes A 60 → A owes B 40)", () => {
  const result = simplifyDebts([
    { from: "A", to: "B", amount: new Decimal(100) },
    { from: "B", to: "A", amount: new Decimal(60) },
  ]);
  assert(result.length === 1, `expected 1 debt, got ${result.length}`);
  assert(result[0].amount.toNumber() === 40, `expected 40, got ${result[0].amount}`);
});

test("simplifyDebts — 3 person chain collapses (A→B 100, B→C 100 → A→C 100)", () => {
  const result = simplifyDebts([
    { from: "A", to: "B", amount: new Decimal(100) },
    { from: "B", to: "C", amount: new Decimal(100) },
  ]);
  assert(result.length === 1, `expected 1 debt, got ${result.length}`);
  assert(result[0].from === "A" && result[0].to === "C", `expected A→C, got ${result[0].from}→${result[0].to}`);
  assert(result[0].amount.toNumber() === 100, `expected 100, got ${result[0].amount}`);
});

test("simplifyDebts — empty input returns empty output", () => {
  const result = simplifyDebts([]);
  assert(result.length === 0, "should be empty");
});

test("simplifyDebts — total amount conserved after simplification", () => {
  const result = simplifyDebts([
    { from: "A", to: "B", amount: new Decimal(50) },
    { from: "A", to: "C", amount: new Decimal(30) },
    { from: "B", to: "C", amount: new Decimal(20) },
  ]);
  const total = result.reduce((sum, d) => sum + d.amount.toNumber(), 0);
  assert(Math.abs(total - 80) < 0.01, `expected ~80, got ${total}`);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(40)}`);
console.log(`  ${passed} passed  |  ${failed} failed`);
console.log(`${"─".repeat(40)}\n`);

if (failed > 0) process.exit(1);