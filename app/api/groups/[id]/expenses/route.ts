import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import {
  splitEqually, validateUnequal, validatePercentage,
  splitByPercentage, splitByShares,
} from "@/lib/splits";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

const splitItemSchema = z.object({
  userId: z.string(),
  amount: z.number().optional(),
  percentage: z.number().optional(),
  shares: z.number().optional(),
});

const createExpenseSchema = z.object({
  title: z.string().min(1),
  totalAmount: z.number().positive(),
  payerId: z.string(),
  splitType: z.enum(["EQUAL", "UNEQUAL", "PERCENTAGE", "SHARE"]),
  splits: z.array(splitItemSchema).min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const expenses = await prisma.expense.findMany({
      where: { groupId: id },
      include: {
        payer: true,
        splits: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(expenses.map((e) => serialize(e as Record<string, unknown>)));
  } catch (error) {
    console.error("GET EXPENSES ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, totalAmount, payerId, splitType, splits } = parsed.data;
    const totalDecimal = new Decimal(totalAmount);
    const memberIds = splits.map((s) => s.userId);

    let resolvedAmounts: { userId: string; amount: Decimal }[];

    if (splitType === "EQUAL") {
      resolvedAmounts = splitEqually(totalDecimal, memberIds);
    } else if (splitType === "UNEQUAL") {
      const splitResults = splits.map((s) => ({
        userId: s.userId,
        amount: new Decimal(s.amount!),
      }));
      if (!validateUnequal(totalDecimal, splitResults)) {
        return NextResponse.json(
          { error: "Split amounts must add up to total amount" },
          { status: 400 }
        );
      }
      resolvedAmounts = splitResults;
    } else if (splitType === "PERCENTAGE") {
      const percentages = splits.map((s) => s.percentage!);
      if (!validatePercentage(percentages)) {
        return NextResponse.json(
          { error: "Percentages must add up to 100" },
          { status: 400 }
        );
      }
      resolvedAmounts = splitByPercentage(
        totalDecimal,
        splits.map((s) => ({ userId: s.userId, percentage: s.percentage! }))
      );
    } else {
      resolvedAmounts = splitByShares(
        totalDecimal,
        splits.map((s) => ({ userId: s.userId, shares: s.shares! }))
      );
    }

    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          title,
          amount: totalDecimal,
          payerId,
          groupId: id,
          split_type: splitType,
        },
      });
      await tx.expenseSplit.createMany({
        data: resolvedAmounts.map((r) => ({
          expenseId: exp.id,
          userId: r.userId,
          amount: r.amount,
        })),
      });
      return exp;
    });

    return NextResponse.json(serialize(expense as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error("POST EXPENSE ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

