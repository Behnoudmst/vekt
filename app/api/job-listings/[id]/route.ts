import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { jobSchema } from "@/lib/schemas";
import { generateSlug } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

async function generateUniqueSlug(title: string, excludeId: string): Promise<string> {
  const base = generateSlug(title) || "job";
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await prisma.job.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) break;
    slug = `${base}-${counter++}`;
  }
  return slug;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check ownership — admins can edit any job, recruiters only their own
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    const job = await prisma.job.findUnique({ where: { id }, select: { createdById: true } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (job.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const body = await req.json();

    // Toggle-only call (just isActive boolean)
    if (Object.keys(body).length === 1 && "isActive" in body) {
      const job = await prisma.job.update({
        where: { id },
        data: { isActive: body.isActive },
      });
      logger.info({ jobId: id, isActive: job.isActive }, "API: job toggled");
      return NextResponse.json(job);
    }

    // Full update — validate all editable fields
    const validation = jobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }
    const slug = await generateUniqueSlug(validation.data.title, id);
    const job = await prisma.job.update({
      where: { id },
      data: { ...validation.data, slug },
    });
    logger.info({ jobId: id }, "API: job updated");
    return NextResponse.json(job);
  } catch (err) {
    logger.error({ err }, "API: PATCH /api/job-listings/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check ownership — admins can delete any job, recruiters only their own
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    const job = await prisma.job.findUnique({ where: { id }, select: { createdById: true } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (job.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    await prisma.job.delete({ where: { id } });
    logger.info({ jobId: id }, "API: job deleted");
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "API: DELETE /api/job-listings/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

