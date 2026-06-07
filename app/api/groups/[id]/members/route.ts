import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { sendGroupInviteEmail } from "@/lib/emails";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const members = await prisma.groupMember.findMany({
      where: { groupId: id },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json(members.map((m) => serialize(m as Record<string, unknown>)));
  } catch (error) {
    console.error("GET MEMBERS ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Check group exists and get its name
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Check user isn't already a member
    const existing = await prisma.groupMember.findFirst({
      where: { groupId: id, userId },
    });
    if (existing) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 });
    }

    // Add member
    const member = await prisma.groupMember.create({
      data: { groupId: id, userId, is_admin: false },
      include: { user: true },
    });

    // ✅ Send invite email
    const inviter = session.user as { id: string; name?: string | null };
    await sendGroupInviteEmail(
      member.user.name ?? "there",
      member.user.email,
      group.name,
      inviter.name ?? "Someone"
    );

    return NextResponse.json(serialize(member as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error("POST MEMBER ERROR:", error);
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

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await prisma.groupMember.deleteMany({
      where: { groupId: id, userId },
    });

    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    console.error("DELETE MEMBER ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}