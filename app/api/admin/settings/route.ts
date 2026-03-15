import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DEFAULTS: Record<string, string> = {
  RETENTION_DAYS: "90",
};

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

  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) map[row.key] = row.value;
  return NextResponse.json(map);
}

const updateSchema = z.object({
  RETENTION_DAYS: z.coerce.number().int().min(1).max(3650),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  const err = adminOnly(session);
  if (err) return err;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.setting.upsert({
    where: { key: "RETENTION_DAYS" },
    update: { value: String(parsed.data.RETENTION_DAYS) },
    create: { key: "RETENTION_DAYS", value: String(parsed.data.RETENTION_DAYS) },
  });

  return NextResponse.json({ RETENTION_DAYS: parsed.data.RETENTION_DAYS });
}
