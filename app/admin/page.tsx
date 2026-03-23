import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminPanel from "./AdminPanel";

const DEFAULTS: Record<string, string> = { RETENTION_DAYS: "90" };

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/recruiter");

  const [users, settingRows, stats, templateRows] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, role: true, createdAt: true },
    }),
    prisma.setting.findMany(),
    Promise.all([
      prisma.job.count(),
      prisma.candidate.count(),
      prisma.evaluation.count(),
    ]),
    prisma.emailTemplate.findMany({ orderBy: { type: "asc" } }),
  ]);

  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of settingRows) settings[row.key] = row.value;

  const [jobCount, candidateCount, evaluationCount] = stats;

  const templates = Object.fromEntries(
    templateRows.map((t) => [t.type, { subject: t.subject, body: t.body }]),
  );

  return (
    <AdminPanel
      currentUserId={session.user!.id!}
      initialUsers={users}
      initialSettings={settings}
      initialTemplates={templates}
      stats={{ jobCount, candidateCount, evaluationCount }}
    />
  );
}
