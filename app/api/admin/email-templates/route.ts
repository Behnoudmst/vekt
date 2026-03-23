import { EmailType } from "@/generated/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

function adminOnly(session: Session | null) {
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET() {
  const session = await auth();
  const err = adminOnly(session);
  if (err) return err;

  const templates = await prisma.emailTemplate.findMany({
    orderBy: { type: "asc" },
  });

  // Return a map keyed by type for easy client consumption
  const map = Object.fromEntries(templates.map((t) => [t.type, { subject: t.subject, body: t.body }]));

  // Fill in any missing types with empty defaults
  for (const type of Object.values(EmailType)) {
    if (!map[type]) map[type] = { subject: "", body: "" };
  }

  return NextResponse.json(map);
}
