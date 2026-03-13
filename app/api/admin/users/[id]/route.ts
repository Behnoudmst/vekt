import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

function adminOnly(session: Session | null) {
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const err = adminOnly(session);
  if (err) return err;

  const { id } = await params;

  // Prevent self-deletion
  if (session!.user?.id === id)
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  await prisma.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
