import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const messages = await prisma.message.findMany({
      where: { expenseId: id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages.map((m) => serialize(m as Record<string, unknown>)));
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
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

    // ✅ FIX: cast to any to access id which is set from token.dbId
    const userId = (session.user as any).id as string;
    if (!userId) {
      console.error("POST MESSAGE ERROR: userId is undefined", session.user);
      return NextResponse.json({ error: "User ID not found in session" }, { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        expenseId: id,
        userId,  // ✅ now correctly the DB id
      },
      include: { user: true },
    });

    const serialized = serialize(message as Record<string, unknown>);
    await pusher.trigger(`expense-${id}`, "new-message", serialized);

    return NextResponse.json(serialized, { status: 201 });
  } catch (error) {
    console.error("POST MESSAGE ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

