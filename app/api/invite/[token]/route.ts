import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { token } = await params;

  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: { group: { select: { id: true, name: true } } },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.used) {
    return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  }
  if (new Date() > invite.expires_at) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  const alreadyMember = await prisma.groupMember.findFirst({
    where: { groupId: invite.group_id, userId: session!.user.id },
  });
  if (alreadyMember) {
    return NextResponse.json({ groupId: invite.group_id, alreadyMember: true });
  }

  await prisma.$transaction([
    prisma.groupMember.create({
      data: {
        groupId:  invite.group_id,
        userId:   session!.user.id,
        is_admin: false,
      },
    }),
    prisma.groupInvite.update({
      where: { token },
      data:  { used: true },
    }),
  ]);

  return NextResponse.json({ groupId: invite.group_id, groupName: invite.group.name });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: {
      group:   { select: { name: true, currency: true, _count: { select: { members: true } } } },
      creator: { select: { name: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.used) {
    return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  }
  if (new Date() > invite.expires_at) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  return NextResponse.json({
    groupName:   invite.group.name,
    currency:    invite.group.currency,
    memberCount: invite.group._count.members,
    invitedBy:   invite.creator.name,
    expiresAt:   invite.expires_at,
  });
}