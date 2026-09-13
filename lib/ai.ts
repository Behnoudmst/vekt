import { createHash } from "crypto";
import logger from "@/lib/logger";
import { redactIdentity } from "@/lib/redact";

export interface EvaluationResult {
  score: number;
  reasoning: string;
  pros: string[];
  cons: string[];
}

/**
 * Provenance recorded alongside every evaluation.
 *
 * EU AI Act Article 12 requires high-risk systems to keep records that allow a
 * decision to be traced after the fact. Models are deprecated and prompts are
 * edited, so "the AI scored this CV 62" is not an auditable record unless you
 * also know which model, which prompt and which version of this code produced
 * it. Keep this whenever you change the pipeline.
 */
export interface EvaluationProvenance {
  provider: string;
  model: string;
  /** SHA-256 of the exact system prompt + user prompt sent to the provider. */
  promptHash: string;
  /** Bumped by hand whenever SYSTEM_PROMPT or buildPrompt changes. */
  evaluatorVersion: string;
  /** Redaction counts by category, e.g. { email: 1, phone: 1, name: 3 }. */
  redactions: Record<string, number>;
}

/**
 * Bump this whenever the prompt, the scoring instructions or the redaction
 * behaviour changes. Evaluations produced by different versions are not
 * comparable and must not be ranked against each other.
 */
export const EVALUATOR_VERSION = "2026.09.1";

const SYSTEM_PROMPT = `You are an expert recruitment screening AI called Vekt. 
Your job is to evaluate a candidate's resume against a specific job description and custom weighting criteria.
You MUST respond with valid JSON only — no markdown, no explanation outside the JSON.
The JSON must have exactly these fields:
{
  "score": <integer 0-100>,
  "reasoning": "<exactly 2 sentences justifying the score>",
  "pros": ["<bullet 1>", "<bullet 2>", ...],
  "cons": ["<bullet 1>", "<bullet 2>", ...]
}`;

function truncateForLog(value: string, max = 600): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}... [truncated ${value.length - max} chars]`;
}

function buildPrompt(
  jobTitle: string,
  jobDescription: string,
  customPrompt: string | null,
  resumeText: string,
): string {
  const parts: string[] = [
    `## Job Title\n${jobTitle}`,
    `## Job Description\n${jobDescription}`,
  ];
  if (customPrompt) {
    parts.push(`## Weighting & Evaluation Criteria (IMPORTANT — follow strictly)\n${customPrompt}`);
  }
  parts.push(`## Candidate Resume\n${resumeText}`);
  return parts.join("\n\n");
}

async function evaluateWithOpenAI(
  prompt: string,
  model = process.env.OPENAI_MODEL ?? "gpt-4o",
): Promise<{ result: EvaluationResult; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  logger.info(
    { provider: "openai", model, endpoint: "https://api.openai.com/v1/chat/completions" },
    "AI: sending evaluation request",
  );

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error(
      {
        provider: "openai",
        model,
        status: res.status,
        body: truncateForLog(body),
      },
      "AI: OpenAI request failed",
    );
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  try {
    return { result: JSON.parse(content) as EvaluationResult, model };
  } catch (error) {
    logger.error(
      {
        provider: "openai",
        model,
        content: truncateForLog(String(content)),
        error,
      },
      "AI: failed to parse OpenAI JSON response",
    );
    throw error;
  }
}

async function evaluateWithOpenRouter(
  prompt: string,
  model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
): Promise<{ result: EvaluationResult; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  logger.info(
    { provider: "openrouter", model, endpoint: "https://openrouter.ai/api/v1/chat/completions" },
    "AI: sending evaluation request",
  );

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "Vekt",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error(
      {
        provider: "openrouter",
        model,
        status: res.status,
        body: truncateForLog(body),
      },
      "AI: OpenRouter request failed",
    );
    throw new Error(`OpenRouter API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenRouter");

  try {
    return { result: JSON.parse(content) as EvaluationResult, model };
  } catch (error) {
    logger.error(
      {
        provider: "openrouter",
        model,
        content: truncateForLog(String(content)),
        error,
      },
      "AI: failed to parse OpenRouter JSON response",
    );
    throw error;
  }
}

async function evaluateWithOllama(
  prompt: string,
  model?: string,
): Promise<{ result: EvaluationResult; model: string }> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const ollamaModel = model ?? process.env.OLLAMA_MODEL ?? "llama3.2";

  logger.info(
    { provider: "ollama", model: ollamaModel, endpoint: `${baseUrl}/api/chat` },
    "AI: sending evaluation request",
  );

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      format: "json",
      stream: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error(
      {
        provider: "ollama",
        model: ollamaModel,
        status: res.status,
        body: truncateForLog(body),
      },
      "AI: Ollama request failed",
    );
    throw new Error(`Ollama API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data.message?.content;
  if (!content) throw new Error("Empty response from Ollama");

  try {
    return { result: JSON.parse(content) as EvaluationResult, model: ollamaModel };
  } catch (error) {
    logger.error(
      {
        provider: "ollama",
        model: ollamaModel,
        content: truncateForLog(String(content)),
        error,
      },
      "AI: failed to parse Ollama JSON response",
    );
    throw error;
  }
}

export async function evaluateCandidate(params: {
  jobTitle: string;
  jobDescription: string;
  customPrompt: string | null;
  resumeText: string;
  /** Used to redact the candidate's own name from the text sent to the model. */
  candidateName?: string;
}): Promise<{
  result: EvaluationResult;
  promptSnapshot: string;
  provenance: EvaluationProvenance;
}> {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  logger.info({ provider }, "AI: selected evaluation provider");

  // Strip direct identifiers before anything reaches the provider.
  const redacted = redactIdentity(params.resumeText, params.candidateName);

  const prompt = buildPrompt(
    params.jobTitle,
    params.jobDescription,
    params.customPrompt,
    redacted.text,
  );
  const promptSnapshot = `${SYSTEM_PROMPT}\n\n---\n\n${prompt}`;
  const promptHash = createHash("sha256").update(promptSnapshot).digest("hex");

  let result: EvaluationResult;
  let model: string;

  try {
    if (provider === "openai") {
      ({ result, model } = await evaluateWithOpenAI(prompt));
    } else if (provider === "openrouter") {
      ({ result, model } = await evaluateWithOpenRouter(prompt));
    } else if (provider === "ollama") {
      ({ result, model } = await evaluateWithOllama(prompt));
    } else {
      // Mock provider — deterministic for a given prompt so that development
      // and tests are reproducible. Never use this to make real decisions.
      logger.info({ provider: "mock" }, "AI: using mock evaluation provider");
      await new Promise((r) => setTimeout(r, 600));
      model = "mock";
      const seed = parseInt(promptHash.slice(0, 8), 16);
      const score = 40 + (seed % 61);
      result = {
        score,
        reasoning: `Mock evaluation for the ${params.jobTitle} role. This score is generated deterministically from the prompt and carries no assessment of the candidate.`,
        pros: ["Mock provider — no assessment performed"],
        cons: ["Mock provider — no assessment performed"],
      };
    }
  } catch (error) {
    logger.error(
      {
        provider,
        jobTitle: params.jobTitle,
        hasCustomPrompt: Boolean(params.customPrompt),
        resumeLength: params.resumeText.length,
        error,
      },
      "AI: evaluation provider failed",
    );
    throw error;
  }

  // Validate required fields
  if (
    typeof result.score !== "number" ||
    typeof result.reasoning !== "string" ||
    !Array.isArray(result.pros) ||
    !Array.isArray(result.cons)
  ) {
    logger.error(
      { provider, result },
      "AI: evaluation response missing required fields",
    );
    throw new Error(`AI returned malformed evaluation: ${JSON.stringify(result)}`);
  }

  // Clamp score
  result.score = Math.max(0, Math.min(100, Math.round(result.score)));

  const provenance: EvaluationProvenance = {
    provider,
    model,
    promptHash,
    evaluatorVersion: EVALUATOR_VERSION,
    redactions: redacted.counts,
  };

  logger.info(
    { provider, model, promptHash, evaluatorVersion: EVALUATOR_VERSION, score: result.score },
    "AI: evaluation completed",
  );

  return { result, promptSnapshot, provenance };
}
