import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { calculateGroupBalances } from "@/lib/balances";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ balances.ts converts all Decimal → number already
    const balances = await calculateGroupBalances(id);
    return NextResponse.json(balances);
  } catch (error) {
    console.error("GET GROUP BALANCES ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

