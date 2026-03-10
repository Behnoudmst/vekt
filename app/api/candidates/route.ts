import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { runEvaluationPipeline } from "@/lib/queue";
import { candidateApplicationSchema } from "@/lib/schemas";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

/**
 * @swagger
 * /api/candidates:
 *   post:
 *     summary: Submit a new candidate application
 *     description: Accepts a multipart form with name, email, and resume PDF. Creates a candidate record and triggers the evaluation pipeline asynchronously.
 *     tags:
 *       - Candidates
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - resume
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Candidate created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 status:
 *                   type: string
 *       400:
 *         description: Validation error or missing resume
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get("name");
    const email = formData.get("email");
    const resume = formData.get("resume") as File | null;
    const jobListingId = formData.get("jobListingId") as string | null;

    const validation = candidateApplicationSchema.safeParse({ name, email });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    if (!resume || resume.type !== "application/pdf") {
      return NextResponse.json(
        { error: "A PDF resume is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.candidate.findUnique({
      where: { email: validation.data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A candidate with this email already exists" },
        { status: 409 },
      );
    }

    // Save PDF to local disk
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filename = `${Date.now()}-${resume.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
    const filePath = path.join(uploadsDir, filename);
    const bytes = await resume.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const candidate = await prisma.candidate.create({
      data: {
        name: validation.data.name,
        email: validation.data.email,
        resumePath: `/uploads/${filename}`,
        ...(jobListingId ? { jobListingId } : {}),
      },
    });

    logger.info({ candidateId: candidate.id }, "API: candidate created");

    // Fire-and-forget: run evaluation pipeline in background
    runEvaluationPipeline(candidate.id).catch((err) =>
      logger.error({ candidateId: candidate.id, err }, "API: pipeline error"),
    );

    return NextResponse.json(
      {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.status,
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error({ err }, "API: POST /api/candidates error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/candidates:
 *   get:
 *     summary: List all candidates (admin/debug)
 *     tags:
 *       - Candidates
 *     responses:
 *       200:
 *         description: Array of all candidates
 */
export async function GET() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      scoreQ1: true,
      scoreQ2: true,
      scoreTotal: true,
      appliedAt: true,
    },
  });
  return NextResponse.json(candidates);
}
