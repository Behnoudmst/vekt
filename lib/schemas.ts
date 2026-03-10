import { z } from "zod";

export const candidateApplicationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
});

export const webhookScoreSchema = z.object({
  candidateId: z.string().cuid("Invalid candidate ID"),
  score: z.number().min(0).max(100),
});

export const reviewDecisionSchema = z.object({
  decision: z.enum(["HIRE", "REJECT"]),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const jobListingSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required"),
  location: z.string().optional(),
});

export type CandidateApplicationInput = z.infer<typeof candidateApplicationSchema>;
export type WebhookScoreInput = z.infer<typeof webhookScoreSchema>;
export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type JobListingInput = z.infer<typeof jobListingSchema>;
