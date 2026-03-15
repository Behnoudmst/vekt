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
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return JSON.parse(content) as EvaluationResult;
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
    throw new Error(`Ollama API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data.message?.content;
  if (!content) throw new Error("Empty response from Ollama");

  return JSON.parse(content) as EvaluationResult;
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

  logger.info({ provider }, "AI: starting evaluation");

  let result: EvaluationResult;

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

  // Validate required fields
  if (
    typeof result.score !== "number" ||
    typeof result.reasoning !== "string" ||
    !Array.isArray(result.pros) ||
    !Array.isArray(result.cons)
  ) {
    throw new Error(`AI returned malformed evaluation: ${JSON.stringify(result)}`);
  }

  // Clamp score
  result.score = Math.max(0, Math.min(100, Math.round(result.score)));

  logger.info({ score: result.score, provider }, "AI: evaluation complete");

  return { result, promptSnapshot: `${SYSTEM_PROMPT}\n\n---\n\n${prompt}` };
}
