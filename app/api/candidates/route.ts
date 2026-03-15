import { auth } from "@/lib/auth";
import { PRIVACY_POLICY_VERSION } from "@/lib/brand";
import { inngest } from "@/lib/inngest";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { runEvaluationPipelineDirect } from "@/lib/queue";
import { candidateApplicationSchema } from "@/lib/schemas";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { extractText } from "unpdf";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const UPLOADS_DIR = path.join(process.cwd(), "private", "uploads");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get("name");
    const email = formData.get("email");
    const resume = formData.get("resume") as File | null;
    const jobId = formData.get("jobId") as string | null;

    const validation = candidateApplicationSchema.safeParse({ name, email });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const consentGiven = formData.get("consentGiven") === "true";
    if (!consentGiven) {
      return NextResponse.json(
        { error: "Consent to data processing is required" },
        { status: 400 },
      );
    }

    if (!resume || resume.type !== "application/pdf") {
      return NextResponse.json(
        { error: "A PDF resume is required" },
        { status: 400 },
      );
    }

    if (resume.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Resume must be under 5 MB" },
        { status: 413 },
      );
    }

    // Save PDF to private directory (not publicly served)
    await mkdir(UPLOADS_DIR, { recursive: true });
    const filename = `${randomUUID()}.pdf`;
    const filePath = path.join(UPLOADS_DIR, filename);
    const bytes = await resume.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Extract PDF text
    let resumeText = "";
    try {
      const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
      resumeText = Array.isArray(text) ? text.join("\n") : (text ?? "");
    } catch (pdfErr) {
      logger.warn({ pdfErr }, "API: PDF text extraction failed, continuing with empty text");
    }

    const candidate = await prisma.candidate.create({
      data: {
        name: validation.data.name,
        email: validation.data.email,
        resumePath: `/api/uploads/${filename}`,
        resumeText,
        consentGiven: true,
        consentAt: new Date(),
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        ...(jobId ? { jobId } : {}),
      },
    });

    logger.info({ candidateId: candidate.id }, "API: candidate created");

    // Trigger evaluation — via Inngest if configured, else direct fallback
    const inngestEventKey = process.env.INNGEST_EVENT_KEY;
    if (inngestEventKey) {
      inngest.send({ name: "vekt/candidate.created", data: { candidateId: candidate.id } }).catch(
        (err) => logger.error({ candidateId: candidate.id, err }, "API: Inngest send error"),
      );
    } else {
      runEvaluationPipelineDirect(candidate.id).catch((err) =>
        logger.error({ candidateId: candidate.id, err }, "API: pipeline error"),
      );
    }

    return NextResponse.json(
      { id: candidate.id, name: candidate.name, email: candidate.email, status: candidate.status },
      { status: 201 },
    );
  } catch (err) {
    logger.error({ err }, "API: POST /api/candidates error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidates = await prisma.candidate.findMany({
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      appliedAt: true,
      evaluation: { select: { score: true } },
    },
  });
  return NextResponse.json(candidates);
}

