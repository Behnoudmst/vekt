import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/unsubscribe?id=<candidateId>
 *
 * One-click unsubscribe link sent in every candidate email.
 * Sets emailOptOut=true for the candidate. DATA_RETENTION_WARNING
 * emails are still dispatched regardless (GDPR legal obligation).
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing id parameter.", { status: 400, headers: { "Content-Type": "text/plain" } });
  }

  const candidate = await prisma.candidate.findUnique({ where: { id }, select: { id: true } });
  if (!candidate) {
    return new NextResponse("Not found.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  await prisma.candidate.update({ where: { id }, data: { emailOptOut: true } });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed</title>
</head>
<body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:80px 16px;text-align:center;">
  <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:48px 40px;">
    <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 16px;">You've been unsubscribed</h1>
    <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 16px;">
      You will no longer receive application status update emails.
    </p>
    <p style="font-size:12px;color:#9ca3af;margin:0;">
      Note: you may still receive mandatory GDPR data retention notices as required by law.
    </p>
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
