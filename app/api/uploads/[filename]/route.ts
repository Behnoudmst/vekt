import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { Readable } from "stream";

const UPLOADS_DIR = path.join(process.cwd(), "private", "uploads");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  const currentUserId = session.user?.id;

  if (!isAdmin && !currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Prevent path traversal — only allow plain filenames (UUID.pdf)
  if (!/^[a-f0-9-]{36}\.pdf$/i.test(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resumePath = `/api/uploads/${filename}`;
  const candidate = await prisma.candidate.findFirst({
    where: {
      resumePath,
      ...(!isAdmin && currentUserId ? { job: { is: { createdById: currentUserId } } } : {}),
    },
    select: { id: true },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stream = createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
