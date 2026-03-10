import { prisma } from "@/lib/prisma";
import ApplyForm from "./ApplyForm";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;

  const jobListing = jobId
    ? await prisma.jobListing.findUnique({
        where: { id: jobId, isActive: true },
        select: { id: true, title: true, description: true, location: true },
      })
    : null;

  return <ApplyForm jobListing={jobListing} />;
}

