import { EmailType } from "@/generated/client";
import { COMPANY_NAME } from "@/lib/brand";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const FROM = process.env.EMAIL_FROM ?? "noreply@vekt.io";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function getStatusPageUrl(candidateId: string): string {
  return `${APP_URL}/status/${candidateId}`;
}

export function getUnsubscribeUrl(candidateId: string): string {
  return `${APP_URL}/api/unsubscribe?id=${candidateId}`;
}

interface SendEmailOptions {
  candidateId: string;
  type: EmailType;
}

/**
 * Sends a transactional email to a candidate based on the stored template for `type`.
 *
 * Respects `emailOptOut` — except for DATA_RETENTION_WARNING which is always
 * dispatched as a legal GDPR obligation.
 *
 * Throws on send failure so Inngest can retry the step.
 */
export async function sendCandidateEmail({ candidateId, type }: SendEmailOptions): Promise<void> {
  const resend = getResend();
  if (!resend) {
    logger.warn({ candidateId, type }, "Email: RESEND_API_KEY not set, skipping");
    return;
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });

  if (!candidate) {
    logger.warn({ candidateId, type }, "Email: candidate not found, skipping");
    return;
  }

  if (candidate.emailOptOut && type !== EmailType.DATA_RETENTION_WARNING) {
    logger.info({ candidateId, type }, "Email: candidate opted out, skipping");
    return;
  }

  const template = await prisma.emailTemplate.findUnique({ where: { type } });
  if (!template) {
    logger.warn({ candidateId, type }, "Email: no template configured, skipping");
    return;
  }

  const retentionSetting = await prisma.setting.findUnique({ where: { key: "RETENTION_DAYS" } });
  const retentionDays = retentionSetting ? parseInt(retentionSetting.value, 10) : 90;
  const retentionDate = new Date(candidate.appliedAt);
  retentionDate.setDate(retentionDate.getDate() + retentionDays);

  const vars: Record<string, string> = {
    candidateName: candidate.name,
    jobTitle: candidate.job?.title ?? "General Position",
    companyName: COMPANY_NAME,
    statusPageUrl: getStatusPageUrl(candidateId),
    retentionDate: retentionDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };

  const subject = interpolate(template.subject, vars);
  const renderedBody = interpolate(template.body, vars);

  const unsubscribeFooter = `<p style="font-size:11px;color:#9ca3af;margin-top:24px;text-align:center;">
    You received this email because you applied for a position via ${COMPANY_NAME}.<br>
    <a href="${getUnsubscribeUrl(candidateId)}" style="color:#9ca3af;">Unsubscribe</a> from application updates.
  </p>`;

  const html = `${renderedBody}${unsubscribeFooter}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: candidate.email,
      subject,
      html,
    });

    if (error) throw new Error(error.message);

    await prisma.emailLog.create({
      data: { candidateId, type, resendId: data?.id ?? null },
    });

    logger.info({ candidateId, type, resendId: data?.id }, "Email: sent");
  } catch (err) {
    logger.error({ candidateId, type, err }, "Email: send failed");
    throw err; // Re-throw so Inngest retries the step
  }
}
