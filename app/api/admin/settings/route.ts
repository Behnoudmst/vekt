import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DEFAULTS: Record<string, string> = {
  RETENTION_DAYS: "90",
  STATUS_EMAIL_DELAY_HOURS: "48",
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
  STATUS_EMAIL_DELAY_HOURS: z.coerce.number().int().min(0).max(168).optional(),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  const err = adminOnly(session);
  if (err) return err;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const ops = [
    prisma.setting.upsert({
      where: { key: "RETENTION_DAYS" },
      update: { value: String(parsed.data.RETENTION_DAYS) },
      create: { key: "RETENTION_DAYS", value: String(parsed.data.RETENTION_DAYS) },
    }),
  ];

  if (parsed.data.STATUS_EMAIL_DELAY_HOURS !== undefined) {
    ops.push(
      prisma.setting.upsert({
        where: { key: "STATUS_EMAIL_DELAY_HOURS" },
        update: { value: String(parsed.data.STATUS_EMAIL_DELAY_HOURS) },
        create: { key: "STATUS_EMAIL_DELAY_HOURS", value: String(parsed.data.STATUS_EMAIL_DELAY_HOURS) },
      }),
    );
  }

  await prisma.$transaction(ops);

  const updated: Record<string, number> = { RETENTION_DAYS: parsed.data.RETENTION_DAYS };
  if (parsed.data.STATUS_EMAIL_DELAY_HOURS !== undefined)
    updated.STATUS_EMAIL_DELAY_HOURS = parsed.data.STATUS_EMAIL_DELAY_HOURS;

  return NextResponse.json(updated);
}
