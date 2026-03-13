import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CandidatesTable from "./CandidatesTable";

export default async function AllCandidatesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const candidates = await prisma.candidate.findMany({
    orderBy: { appliedAt: "desc" },
    include: {
      job: { select: { id: true, title: true } },
      evaluation: {
        select: {
          score: true,
          reasoning: true,
          pros: true,
          cons: true,
          promptSnapshot: true,
        },
      },
    },
  });

  return (
    <div className="min-h-[89vh] bg-background">
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-lg font-semibold mb-4">All Candidates</h1>
        <Card>
          <CardContent className="p-0">
            <CandidatesTable candidates={candidates} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
