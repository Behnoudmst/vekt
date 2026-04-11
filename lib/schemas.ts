import { z } from "zod";

export const candidateApplicationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
});

export const reviewDecisionSchema = z.object({
  decision: z.enum(["ACCEPT", "SHORTLIST", "REJECT"]),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const jobSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required"),
  location: z.string().optional(),
  customPrompt: z.string().optional(),
  threshold: z.number().int().min(0).max(100).optional(),
});

export const candidateAnswersSchema = z
  .array(
    z.object({
      questionId: z.string().cuid(),
      optionIds: z.array(z.string().cuid()).min(1).max(10),
    }),
  )
  .max(20);

export type CandidateApplicationInput = z.infer<typeof candidateApplicationSchema>;
export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type JobInput = z.infer<typeof jobSchema>;
