import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/public-tokens";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/unsubscribe?token=<signed-token>
 *
 * Shows a confirmation page for the unsubscribe request.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing token parameter.", { status: 400, headers: { "Content-Type": "text/plain" } });
  }

  const candidateId = verifyUnsubscribeToken(token);
  if (!candidateId) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400, headers: { "Content-Type": "text/plain" } });
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { id: true } });
  if (!candidate) {
    return new NextResponse("Not found.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Confirm Unsubscribe</title>
</head>
<body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:80px 16px;text-align:center;">
  <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:48px 40px;">
    <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 16px;">Confirm unsubscribe</h1>
    <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
      Confirm that you want to stop receiving application status update emails.
    </p>
    <form method="post" action="/api/unsubscribe">
      <input type="hidden" name="token" value="${token}">
      <button type="submit" style="background:#111827;color:#fff;border:0;border-radius:6px;padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;">
        Unsubscribe
      </button>
    </form>
    <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">
      GDPR data retention notices may still be sent when legally required.
    </p>
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

/**
 * POST /api/unsubscribe
 *
 * Confirms the unsubscribe request and updates emailOptOut=true.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const token = formData.get("token");

  if (typeof token !== "string" || !token) {
    return new NextResponse("Missing token parameter.", { status: 400, headers: { "Content-Type": "text/plain" } });
  }

  const candidateId = verifyUnsubscribeToken(token);
  if (!candidateId) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400, headers: { "Content-Type": "text/plain" } });
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { id: true } });
  if (!candidate) {
    return new NextResponse("Not found.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  await prisma.candidate.update({ where: { id: candidateId }, data: { emailOptOut: true } });

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
