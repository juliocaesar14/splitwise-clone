import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
        id: true, name: true, email: true, avatar_url: true,
        upi_id: true, phone: true, preferred_currency: true, notification_pref: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET ME ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const { name, phone, upi_id, preferred_currency, notification_pref } = body;

    const user = await prisma.user.update({
      where: { id: session!.user.id },
      data: { name, phone, upi_id, preferred_currency, notification_pref },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH ME ERROR:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}