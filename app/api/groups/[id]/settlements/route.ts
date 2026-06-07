import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const updateExpenseSchema = z.object({
  title: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
});

// GET /api/expenses/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAuth();
    if (error) return error;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        payer: true,
        splits: { include: { user: true } },
        messages: { include: { user: true } },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error("GET EXPENSE ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/expenses/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = updateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("UPDATE EXPENSE ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAuth();
    if (error) return error;

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ message: "Expense deleted" });
  } catch (error) {
    console.error("DELETE EXPENSE ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

