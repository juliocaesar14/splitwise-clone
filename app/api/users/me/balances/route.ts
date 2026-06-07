import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { calculateGlobalBalances } from "@/lib/balances";

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ balances.ts converts all Decimal → number already, no serializer needed
    const balances = await calculateGlobalBalances(session.user.id);
    return NextResponse.json(balances);
  } catch (error) {
    console.error("GET GLOBAL BALANCES ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}