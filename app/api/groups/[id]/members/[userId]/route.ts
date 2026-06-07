import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    const { session, error } = await requireAuth();
    if (error) return error;

    // Check if the person doing this is an admin
    const adminMember = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: session!.user.id },
    });
    if (!adminMember?.is_admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // Check the role of the person being removed
    const targetMember = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: userId },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Remove the member
    await prisma.groupMember.delete({
      where: { id: targetMember.id },
    });

    // If we removed an admin, promote the next earliest member
    if (targetMember.is_admin) {
      const next = await prisma.groupMember.findFirst({
        where: { groupId: id },
        orderBy: { joinedAt: "asc" },
      });
      if (next) {
        await prisma.groupMember.update({
          where: { id: next.id },
          data: { is_admin: true },
        });
      }
    }

    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    console.error("DELETE MEMBER ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

