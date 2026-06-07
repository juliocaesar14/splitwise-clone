// app/api/users/search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  if (q.length < 3) {
    return NextResponse.json({ error: "Min 3 characters" }, { status: 400 });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name:  { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, avatar_url: true },
      take: 10,
    });

    return NextResponse.json(users);
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

