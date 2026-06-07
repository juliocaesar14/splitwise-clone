import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY!);

const bodySchema = z.object({
  email: z.string().email().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id: groupId } = await params;

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session!.user.id },
    include: { group: { select: { name: true } } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
  }

  let email: string | undefined;
  try {
    const raw = await req.text();
    if (raw) {
      const parsed = bodySchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
      email = parsed.data.email;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.groupMember.findFirst({
        where: { groupId, userId: existingUser.id },
      });
      if (alreadyMember) {
        return NextResponse.json({ error: "User is already in this group" }, { status: 409 });
      }
    }
  }

  const invite = await prisma.groupInvite.create({
    data: {
      group_id:   groupId,
      created_by: session!.user.id,
      email:      email ?? null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${invite.token}`;
  const groupName = membership.group.name;

  if (email) {
    try {
      await resend.emails.send({
        from:    "Splitwise Clone <noreply@yourdomain.com>",
        to:      email,
        subject: `You're invited to join "${groupName}"`,
        html: `
          <div style="font-family:monospace;background:#0f0f0f;color:#fff;padding:32px;border-radius:12px;max-width:480px">
            <h2 style="color:#c8f560;margin-top:0">you're invited 🎉</h2>
            <p style="color:#aaa"><strong style="color:#fff">${session!.user.name ?? "Someone"}</strong> invited you to join <strong style="color:#fff">"${groupName}"</strong>.</p>
            <a href="${inviteUrl}"
               style="display:inline-block;margin-top:16px;background:#c8f560;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none">
              accept invite
            </a>
            <p style="color:#555;font-size:12px;margin-top:24px">expires in 7 days. if you weren't expecting this, ignore it.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Resend error:", emailErr);
    }
  }

  return NextResponse.json({ inviteUrl, token: invite.token });
}