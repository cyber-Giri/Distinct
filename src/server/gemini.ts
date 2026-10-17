import { GoogleGenAI } from "@google/genai";
import { GEMINI_RESPONSE_JSON_SCHEMA, geminiAnalysisSchema, type GeminiAnalysis } from "@/lib/analysis-schema";
import type { AnalyzeInput } from "@/lib/types";
import { requireGeminiApiKey } from "./env";
import type { GithubRepoCandidate } from "./github";

export const GEMINI_MODEL = "gemini-flash-latest";

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Gemini returned a non-JSON response. The analysis was not completed.");
  }
  try {
    return JSON.parse(body.slice(start, end + 1)) as unknown;
  } catch {
    throw new Error("Gemini returned invalid JSON. The analysis was not completed.");
  }
}

export function parseGeminiAnalysis(raw: string): GeminiAnalysis {
  const parsed = extractJsonObject(raw);
  const result = geminiAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Gemini's structured result failed validation and was discarded.");
  }
  return result.data;
}

function formatCandidates(candidates: GithubRepoCandidate[]): string {
  if (!candidates.length) {
    return "No public GitHub repositories were supplied. similar MUST be an empty array. Do not invent repository names, URLs, or stars.";
  }
  return candidates
    .map((repo, index) => {
      return [
        `Candidate ${index + 1}:`,
        `fullName: ${repo.fullName}`,
        `url: ${repo.url}`,
        `description: ${repo.description || "(none)"}`,
        `stars: ${repo.stars}`,
        `language: ${repo.language || "(unknown)"}`,
        `topics: ${repo.topics.join(", ") || "(none)"}`,
        `updatedAt: ${repo.updatedAt || "(unknown)"}`,
        `relevanceRankScore: ${repo.relevance}`,
        `readmeExcerpt: ${repo.readme || "(readme unavailable)"}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function buildAnalysisPrompt(input: AnalyzeInput, candidates: GithubRepoCandidate[]): string {
  return `You compare a project proposal with a small, ranked list of public GitHub repositories.

Rules:
- Use ONLY the candidate repositories listed below. Never invent repositories, URLs, stars, or claims that every public project was searched.
- If a candidate is not similar enough, omit it from "similar".
- similar[].fullName must match a listed candidate exactly.
- similar[].coverage must have one value per proposed feature, in the same order as "features".
- distinctivenessScore is 0-100 where HIGHER means MORE original / less crowded. Explain that meaning in scoreExplanation.
- Evidence in reasons must cite overlapping functionality visible in the candidate description or README excerpt.
- Shared features and distinctive differences must be concrete.
- limitations must qualify confidence: search scope, missing READMEs, rate limits, and that GitHub search is incomplete.
- If there are no candidates, return similar as [] and lower confidence in limitations.

Proposed project:
title: ${input.title}
type: ${input.type}
repoUrl: ${input.repoUrl ?? "(none)"}
problem/solution statement: ${input.description}
features: ${input.features.length ? input.features.join("; ") : "(not provided — infer carefully from the statement)"}
technology stack: ${input.techStack.length ? input.techStack.join(", ") : "(not provided)"}
requested sources: ${input.sources.join(", ") || "(none)"}
similarity sensitivity: ${["strict", "balanced", "broad"][input.sensitivity] ?? "balanced"}

Ranked GitHub candidates (pre-filtered for relevance; not exhaustive):
${formatCandidates(candidates)}`;
}

export async function analyzeWithGemini(input: AnalyzeInput, candidates: GithubRepoCandidate[]): Promise<GeminiAnalysis> {
  const apiKey = requireGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildAnalysisPrompt(input, candidates),
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: GEMINI_RESPONSE_JSON_SCHEMA,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Gemini error";
    throw new Error(`Gemini request failed: ${message}. This analysis was not replaced with demo data.`);
  }

  const text = response.text;
  if (!text?.trim()) {
    throw new Error("Gemini returned an empty response. This analysis was not replaced with demo data.");
  }
  return parseGeminiAnalysis(text);
}
