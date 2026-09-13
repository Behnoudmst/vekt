import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DEFAULTS: Record<string, string> = {
  RETENTION_DAYS: "90",
  STATUS_EMAIL_DELAY_HOURS: "48",
  // Off by default: a rejection with no human in the loop is a decision based
  // solely on automated processing. See docs/compliance/human-oversight.md.
  AUTO_REJECT_BELOW_THRESHOLD: "false",
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
  AUTO_REJECT_BELOW_THRESHOLD: z.boolean().optional(),
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

  if (parsed.data.AUTO_REJECT_BELOW_THRESHOLD !== undefined) {
    const value = String(parsed.data.AUTO_REJECT_BELOW_THRESHOLD);
    ops.push(
      prisma.setting.upsert({
        where: { key: "AUTO_REJECT_BELOW_THRESHOLD" },
        update: { value },
        create: { key: "AUTO_REJECT_BELOW_THRESHOLD", value },
      }),
    );
    // Turning off human review is a compliance-relevant act by the deployer.
    // It belongs in the record, not only in the settings table.
    logger.warn(
      { adminEmail: session?.user?.email, autoReject: parsed.data.AUTO_REJECT_BELOW_THRESHOLD },
      "Admin: AUTO_REJECT_BELOW_THRESHOLD changed",
    );
  }

  await prisma.$transaction(ops);

  const updated: Record<string, number | boolean> = {
    RETENTION_DAYS: parsed.data.RETENTION_DAYS,
  };
  if (parsed.data.STATUS_EMAIL_DELAY_HOURS !== undefined)
    updated.STATUS_EMAIL_DELAY_HOURS = parsed.data.STATUS_EMAIL_DELAY_HOURS;
  if (parsed.data.AUTO_REJECT_BELOW_THRESHOLD !== undefined)
    updated.AUTO_REJECT_BELOW_THRESHOLD = parsed.data.AUTO_REJECT_BELOW_THRESHOLD;

  return NextResponse.json(updated);
}
