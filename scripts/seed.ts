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
  const adminRaw = process.env.SEED_ADMIN_PASSWORD;
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
  const recruiterRaw = process.env.SEED_RECRUITER_PASSWORD;
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
