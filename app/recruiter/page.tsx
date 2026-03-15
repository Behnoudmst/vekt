import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
        _count: { select: { candidates: true } },
      },
    }),
    prisma.job.count({ where: listingWhere }),
  ]);

  const listingTotalPages = Math.max(1, Math.ceil(listingTotal / PAGE_SIZE));

  return (
    <div className="min-h-[89vh] bg-background">
      <main className="mx-auto max-w-4xl p-6">
        <JobListingsSection
          listings={jobs}
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

