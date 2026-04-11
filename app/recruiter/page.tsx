import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { redirect } from "next/navigation";
import JobListingsSection from "./JobListingsSection";

const PAGE_SIZE = 10;

export default async function RecruiterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  const currentUserId = session.user?.id;

  if (!isAdmin && !currentUserId) {
    redirect("/login");
  }

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const listingStatus = (sp.status ?? "all") as "all" | "active" | "inactive";
  const listingPage = Math.max(1, parseInt(sp.page ?? "1") || 1);

  const listingWhere = {
    ...(q
      ? { OR: [{ title: { contains: q } }, { location: { contains: q } }] }
      : {}),
    ...(listingStatus === "active"
      ? { isActive: true }
      : listingStatus === "inactive"
        ? { isActive: false }
        : {}),
      ...(!isAdmin && currentUserId ? { createdById: currentUserId } : {}),
  };

  const [jobs, listingTotal] = await Promise.all([
    prisma.job.findMany({
      where: listingWhere,
      orderBy: { createdAt: "desc" },
      skip: (listingPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        customPrompt: true,
        threshold: true,
        isActive: true,
        createdAt: true,
        _count: { select: { candidates: true, screeningQuestions: true } },
      },
    }),
    prisma.job.count({ where: listingWhere }),
  ]);
  const safeJobs = jobs.map((job) => ({
    ...job,
    description: sanitizeRichText(job.description),
  }));

  const listingTotalPages = Math.max(1, Math.ceil(listingTotal / PAGE_SIZE));

  return (
    <div className="min-h-[89vh] bg-background">
      <main className="mx-auto max-w-4xl p-6">
        <JobListingsSection
          listings={safeJobs}
          total={listingTotal}
          page={listingPage}
          totalPages={listingTotalPages}
          q={q}
          status={listingStatus}
        />
      </main>
    </div>
  );
}

