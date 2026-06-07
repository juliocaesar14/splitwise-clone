import { splitEqually, splitByPercentage, splitByShares } from "@/lib/splits";
import { simplifyDebts } from "@/lib/simplifyDebts";
import { Decimal } from "@prisma/client/runtime/library";

export default function TestPage() {
  // Test 1 — Equal split of 100 between 3 people
  const equalSplits = splitEqually(new Decimal(100), ["A", "B", "C"]);

  // Test 2 — Percentage split
  const percentageSplits = splitByPercentage(new Decimal(200), [
    { userId: "A", percentage: 50 },
    { userId: "B", percentage: 30 },
    { userId: "C", percentage: 20 },
  ]);

  // Test 3 — Share split
  const shareSplits = splitByShares(new Decimal(120), [
    { userId: "A", shares: 2 },
    { userId: "B", shares: 1 },
    { userId: "C", shares: 1 },
  ]);

  // Test 4 — Debt simplification
  const simplified = simplifyDebts([
    { from: "A", to: "B", amount: new Decimal(50) },
    { from: "C", to: "B", amount: new Decimal(30) },
    { from: "B", to: "C", amount: new Decimal(20) },
  ]);

  return (
    <main className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Phase 4 — Logic Tests</h1>

      {/* Equal Split */}
      <section>
        <h2 className="text-lg font-semibold mb-2">
          ✅ Equal Split — 100 ÷ 3 people
        </h2>
        <table className="border w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">User</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {equalSplits.map((s) => (
              <tr key={s.userId}>
                <td className="border p-2">{s.userId}</td>
                <td className="border p-2">₹{s.amount.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-1">
          Total: ₹{equalSplits.reduce((a, s) => a + Number(s.amount), 0)}
          {" "}(should be 100, remainder cent goes to first person)
        </p>
      </section>

      {/* Percentage Split */}
      <section>
        <h2 className="text-lg font-semibold mb-2">
          ✅ Percentage Split — 200 at 50/30/20%
        </h2>
        <table className="border w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">User</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {percentageSplits.map((s) => (
              <tr key={s.userId}>
                <td className="border p-2">{s.userId}</td>
                <td className="border p-2">₹{s.amount.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-1">
          Total: ₹{percentageSplits.reduce((a, s) => a + Number(s.amount), 0)}
          {" "}(should be 200)
        </p>
      </section>

      {/* Share Split */}
      <section>
        <h2 className="text-lg font-semibold mb-2">
          ✅ Share Split — 120 at 2:1:1 shares
        </h2>
        <table className="border w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">User</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {shareSplits.map((s) => (
              <tr key={s.userId}>
                <td className="border p-2">{s.userId}</td>
                <td className="border p-2">₹{s.amount.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-1">
          Total: ₹{shareSplits.reduce((a, s) => a + Number(s.amount), 0)}
          {" "}(should be 120, A gets 60, B and C get 30 each)
        </p>
      </section>

      {/* Debt Simplification */}
      <section>
        <h2 className="text-lg font-semibold mb-2">
          ✅ Debt Simplification
        </h2>
        <table className="border w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">From</th>
              <th className="border p-2">To</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {simplified.map((d, i) => (
              <tr key={i}>
                <td className="border p-2">{d.from}</td>
                <td className="border p-2">{d.to}</td>
                <td className="border p-2">₹{d.amount.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-1">
          Should be simplified to fewest transactions possible
        </p>
      </section>
    </main>
  );
}

