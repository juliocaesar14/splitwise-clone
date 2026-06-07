import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  currency: z.string().default("INR"),
});

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const groups = await prisma.group.findMany({
      where: { members: { some: { userId: session.user.id } } },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar_url: true } },
          },
        },
        _count: { select: { expenses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(groups.map((g) => serialize(g as Record<string, unknown>)));
  } catch (error) {
    console.error("GET GROUPS ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: {
        ...parsed.data,
        members: {
          create: { userId: session.user.id, is_admin: true },
        },
      },
      include: { members: true },
    });

    return NextResponse.json(serialize(group as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error("POST GROUP ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}