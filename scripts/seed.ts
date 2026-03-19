/**
 * Seeds the database with default accounts and email templates.
 * Run with: npx tsx scripts/seed.ts
 *
 * Credentials are read from env vars:
 *   SEED_ADMIN_EMAIL        (default: admin@vekt.io)
 *   SEED_ADMIN_PASSWORD     (required)
 *   SEED_RECRUITER_EMAIL    (default: recruiter@vekt.io)
 *   SEED_RECRUITER_PASSWORD (required)
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { EmailType, PrismaClient } from "../generated/client";

const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  // --- Admin ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@vekt.io";
  const adminRaw = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  if (!adminRaw) {
    console.error("❌ SEED_ADMIN_PASSWORD env var is required. Add it to your .env file.");
    process.exit(1);
  }
  const adminPassword = await bcrypt.hash(adminRaw, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: adminPassword },
    create: { email: adminEmail, password: adminPassword, role: "ADMIN" },
  });
  console.log(`✅ Seeded admin user:     ${adminEmail}`);

  // --- Recruiter ---
  const recruiterEmail = process.env.SEED_RECRUITER_EMAIL ?? "recruiter@vekt.io";
  const recruiterRaw = process.env.SEED_RECRUITER_PASSWORD ?? "Recruiter123!";
  if (!recruiterRaw) {
    console.error("❌ SEED_RECRUITER_PASSWORD env var is required. Add it to your .env file.");
    process.exit(1);
  }
  const recruiterPassword = await bcrypt.hash(recruiterRaw, 10);
  await prisma.user.upsert({
    where: { email: recruiterEmail },
    update: { password: recruiterPassword },
    create: { email: recruiterEmail, password: recruiterPassword, role: "RECRUITER" },
  });
  console.log(`✅ Seeded recruiter user: ${recruiterEmail}`);

  // --- Dummy job listing ---
  await prisma.job.upsert({
    where: { id: "seed-job-ux-ui-designer" },
    update: {},
    create: {
      id: "seed-job-ux-ui-designer",
      slug: "ux-ui-designer",
      title: "UX/UI Designer",
      description: `We are looking for a talented UX/UI Designer to join our growing team.

**Responsibilities:**
- Design intuitive and visually compelling user interfaces for web and mobile products
- Conduct user research, usability testing, and analyse feedback to iterate on designs
- Create wireframes, prototypes, and high-fidelity mockups using Figma or similar tools
- Collaborate with product managers and engineers to ensure designs are implemented accurately
- Maintain and evolve our design system and style guides

**Requirements:**
- 2+ years of experience in UX/UI design
- Proficiency in Figma (or Sketch / Adobe XD)
- Strong portfolio demonstrating end-to-end design process
- Solid understanding of accessibility standards (WCAG)
- Excellent communication and collaboration skills

**Nice to have:**
- Experience with motion design or micro-interactions
- Familiarity with front-end technologies (HTML/CSS/React)`,
      location: "Remote",
      isActive: true,
    },
  });
  console.log("✅ Seeded job listing:    UX/UI Designer");

  // --- Email templates ---
  const templates: { type: EmailType; subject: string; body: string }[] = [
    {
      type: EmailType.APPLIED,
      subject: "Application Received – {{jobTitle}}",
      body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:40px;">
    <p style="font-size:12px;color:#9ca3af;margin:0 0 20px;text-transform:uppercase;letter-spacing:.05em;">{{companyName}}</p>
    <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 24px;">Application Received</h1>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi {{candidateName}},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
      Thank you for applying for the <strong>{{jobTitle}}</strong> position. We've received your application and our team will be in touch with updates.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 32px;">
      You can track your application status at any time using the link below.
    </p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="{{statusPageUrl}}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:500;display:inline-block;">
        View Application Status
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">{{companyName}} · Powered by Vekt</p>
  </div>
</body></html>`,
    },
    {
      type: EmailType.SHORTLISTED,
      subject: "You've Been Shortlisted – {{jobTitle}}",
      body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:40px;">
    <p style="font-size:12px;color:#9ca3af;margin:0 0 20px;text-transform:uppercase;letter-spacing:.05em;">{{companyName}}</p>
    <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 24px;">Great News!</h1>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi {{candidateName}},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
      We're pleased to let you know that your application for <strong>{{jobTitle}}</strong> has been shortlisted. Our team will review your profile and be in touch with next steps shortly.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="{{statusPageUrl}}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:500;display:inline-block;">
        View Application Status
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">{{companyName}} · Powered by Vekt</p>
  </div>
</body></html>`,
    },
    {
      type: EmailType.REJECTED,
      subject: "Update on Your Application – {{jobTitle}}",
      body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:40px;">
    <p style="font-size:12px;color:#9ca3af;margin:0 0 20px;text-transform:uppercase;letter-spacing:.05em;">{{companyName}}</p>
    <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 24px;">Application Update</h1>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi {{candidateName}},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
      Thank you for taking the time to apply for the <strong>{{jobTitle}}</strong> position. After careful consideration, we won't be moving forward with your application at this time.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 32px;">
      We appreciate your interest in {{companyName}} and encourage you to apply for future opportunities.
    </p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="{{statusPageUrl}}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:500;display:inline-block;">
        View Application Status
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">{{companyName}} · Powered by Vekt</p>
  </div>
</body></html>`,
    },
    {
      type: EmailType.ACCEPTED,
      subject: "Congratulations – Your Application for {{jobTitle}} Has Been Accepted",
      body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:40px;">
    <p style="font-size:12px;color:#9ca3af;margin:0 0 20px;text-transform:uppercase;letter-spacing:.05em;">{{companyName}}</p>
    <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 24px;">Congratulations!</h1>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi {{candidateName}},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
      We're thrilled to inform you that your application for <strong>{{jobTitle}}</strong> has been accepted. A member of our team will be reaching out shortly with details on next steps.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="{{statusPageUrl}}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:500;display:inline-block;">
        View Application Status
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">{{companyName}} · Powered by Vekt</p>
  </div>
</body></html>`,
    },
    {
      type: EmailType.DATA_RETENTION_WARNING,
      subject: "Important: Your Application Data Will Be Deleted on {{retentionDate}}",
      body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:40px;">
    <p style="font-size:12px;color:#9ca3af;margin:0 0 20px;text-transform:uppercase;letter-spacing:.05em;">{{companyName}} · Data Privacy Notice</p>
    <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 24px;">Your Data Is Scheduled for Deletion</h1>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi {{candidateName}},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
      In accordance with our data retention policy and GDPR obligations, your application data for the <strong>{{jobTitle}}</strong> position — including your CV and personal information — will be permanently deleted on <strong>{{retentionDate}}</strong>.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 32px;">
      If you wish to download a copy of your data before it is removed, please follow the instructions on your application status page.
    </p>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="{{statusPageUrl}}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:500;display:inline-block;">
        View Application &amp; Download Data
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">{{companyName}} · This notice is sent as a legal GDPR data retention obligation and cannot be opted out of.</p>
  </div>
</body></html>`,
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { type: t.type },
      update: {},
      create: { type: t.type, subject: t.subject, body: t.body },
    });
  }
  console.log("✅ Seeded email templates: APPLIED, SHORTLISTED, REJECTED, ACCEPTED, DATA_RETENTION_WARNING");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
