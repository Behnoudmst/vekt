import { EmailType } from "@/generated/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function adminOnly(session: Session | null) {
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

const updateSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Body is required"),
});

const VALID_TYPES = new Set(Object.values(EmailType));

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await auth();
  const err = adminOnly(session);
  if (err) return err;

  const { type } = await params;

  if (!VALID_TYPES.has(type as EmailType)) {
    return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const template = await prisma.emailTemplate.upsert({
    where: { type: type as EmailType },
    update: { subject: parsed.data.subject, body: parsed.data.body },
    create: { type: type as EmailType, subject: parsed.data.subject, body: parsed.data.body },
  });

  return NextResponse.json({ type: template.type, subject: template.subject });
}
