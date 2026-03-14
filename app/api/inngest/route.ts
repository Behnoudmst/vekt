import { inngest } from "@/lib/inngest";
import { analyzeCandidate, purgeExpiredCandidates } from "@/lib/queue";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analyzeCandidate, purgeExpiredCandidates],
});
