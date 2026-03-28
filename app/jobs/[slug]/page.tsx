import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { notFound } from "next/navigation";
import ApplyForm from "./ApplyForm";

export default async function JobApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const job = await prisma.job.findUnique({
    where: { slug, isActive: true },
    select: { id: true, title: true, description: true, location: true },
  });

  if (!job) {
    notFound();
  }

  return <ApplyForm job={{ ...job, description: sanitizeRichText(job.description) }} />;
}
