import logger from "@/lib/logger";

export interface EvaluationResult {
  score: number;
  reasoning: string;
  pros: string[];
  cons: string[];
}

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
  model = "gpt-4o",
): Promise<EvaluationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

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
    return JSON.parse(content) as EvaluationResult;
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

async function evaluateWithOllama(
  prompt: string,
  model?: string,
): Promise<EvaluationResult> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const ollamaModel = model ?? process.env.OLLAMA_MODEL ?? "llama3.2";

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
    return JSON.parse(content) as EvaluationResult;
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
}): Promise<{ result: EvaluationResult; promptSnapshot: string }> {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  const prompt = buildPrompt(
    params.jobTitle,
    params.jobDescription,
    params.customPrompt,
    params.resumeText,
  );

  let result: EvaluationResult;

  try {
    if (provider === "openai") {
      result = await evaluateWithOpenAI(prompt);
    } else if (provider === "ollama") {
      result = await evaluateWithOllama(prompt);
    } else {
      // Mock provider — returns a deterministic-ish score for development
      await new Promise((r) => setTimeout(r, 600));
      const score = Math.round(40 + Math.random() * 60);
      result = {
        score,
        reasoning: `The candidate demonstrates relevant experience for the ${params.jobTitle} role. The resume shows a mix of matching skills and areas for growth.`,
        pros: ["Relevant domain experience", "Clear communication in resume"],
        cons: ["Some required skills not explicitly mentioned", "Limited evidence of testing knowledge"],
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

  return { result, promptSnapshot: `${SYSTEM_PROMPT}\n\n---\n\n${prompt}` };
}
