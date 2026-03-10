import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { jobListingSchema } from "@/lib/schemas";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const listings = await prisma.jobListing.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      isActive: true,
      createdAt: true,
      _count: { select: { candidates: true } },
    },
  });
  return NextResponse.json(listings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = jobListingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const listing = await prisma.jobListing.create({ data: validation.data });
    logger.info({ listingId: listing.id }, "API: job listing created");
    return NextResponse.json(listing, { status: 201 });
  } catch (err) {
    logger.error({ err }, "API: POST /api/job-listings error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
