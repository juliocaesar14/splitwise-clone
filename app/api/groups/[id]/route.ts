import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { z } from "zod";

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  currency: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        expenses: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

   const isMember = group.members.some((m) => m.userId === (session!.user as any).id);
    if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(serialize(group as Record<string, unknown>));
  } catch (error) {
    console.error("GET GROUP ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: session.user.id },
    });
    if (!member?.is_admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const group = await prisma.group.update({ where: { id }, data: parsed.data });
    return NextResponse.json(serialize(group as Record<string, unknown>));
  } catch (error) {
    console.error("PATCH GROUP ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: session.user.id },
    });
    if (!member?.is_admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    await prisma.group.delete({ where: { id } });
    return NextResponse.json({ message: "Group deleted" });
  } catch (error) {
    console.error("DELETE GROUP ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}