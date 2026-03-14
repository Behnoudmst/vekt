import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { jobSchema } from "@/lib/schemas";
import { generateSlug } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
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

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").trim();
  const status = searchParams.get("status") ?? "active";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE)) || PAGE_SIZE),
  );

  const where = {
    ...(q
      ? { OR: [{ title: { contains: q } }, { location: { contains: q } }] }
      : {}),
    ...(status === "active"
      ? { isActive: true }
      : status === "inactive"
        ? { isActive: false }
        : {}),
  };

  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        location: true,
        customPrompt: true,
        threshold: true,
        isActive: true,
        createdAt: true,
        _count: { select: { candidates: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = jobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const slug = await generateUniqueSlug(validation.data.title);
    const job = await prisma.job.create({ data: { ...validation.data, slug } });
    logger.info({ jobId: job.id, slug: job.slug }, "API: job created");
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    logger.error({ err }, "API: POST /api/job-listings error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

