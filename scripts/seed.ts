/**
 * Seeds the database with default accounts.
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
import { PrismaClient } from "../generated/client";

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
