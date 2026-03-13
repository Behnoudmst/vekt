import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ApplyForm from "./ApplyForm";

export default async function JobApplyPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId, isActive: true },
    select: { id: true, title: true, description: true, location: true },
  });

  if (!job) {
    notFound();
  }

  return <ApplyForm job={job} />;
}
