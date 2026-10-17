import { z } from "zod";
import type { AnalyzeInput } from "./types";

export const analyzeInputSchema: z.ZodType<AnalyzeInput> = z
  .object({
    type: z.enum(["proposal", "github"]),
    title: z.string().trim().max(200),
    description: z.string().trim().max(4000),
    techStack: z.array(z.string().trim().min(1).max(80)).max(24),
    features: z.array(z.string().trim().min(1).max(240)).max(24),
    repoUrl: z.string().trim().max(300).optional(),
    sources: z.array(z.string().trim().min(1).max(80)).max(12),
    sensitivity: z.number().int().min(0).max(2),
  })
  .superRefine((value, ctx) => {
    if (value.type === "proposal") {
      if (value.title.length < 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add a project title of at least 3 characters.", path: ["title"] });
      }
      if (value.description.length < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add a description of at least 20 characters.",
          path: ["description"],
        });
      }
    }
    if (value.type === "github") {
      if (!value.repoUrl || !/github\.com\/[\w.-]+\/[\w.-]+/i.test(value.repoUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid public GitHub repository URL.",
          path: ["repoUrl"],
        });
      }
    }
  });

export const coverageSchema = z.enum(["full", "partial", "none"]);
export const levelSchema = z.enum(["High", "Medium", "Low"]);
export const recCategorySchema = z.enum(["Features", "Audience", "Tech", "Positioning"]);

export const geminiAnalysisSchema = z.object({
  projectSummary: z.string().min(1).max(4000),
  audience: z.string().min(1).max(500),
  approach: z.string().min(1).max(800),
  features: z.array(z.string().min(1).max(240)).max(24),
  distinctivenessScore: z.number().int().min(0).max(100),
  scoreExplanation: z.string().min(1).max(2000),
  verdict: z.string().min(1).max(800),
  similar: z
    .array(
      z.object({
        fullName: z.string().min(1).max(200),
        similarity: z.number().int().min(0).max(100),
        reasons: z.array(z.string().min(1).max(500)).min(1).max(8),
        sharedFeatures: z.array(z.string().min(1).max(240)).max(16),
        distinctiveDifferences: z.array(z.string().min(1).max(400)).max(12),
        features: z.array(z.string().min(1).max(240)).max(16),
        audience: z.string().min(1).max(400),
        approach: z.string().min(1).max(500),
        cluster: z.string().min(1).max(80),
        coverage: z.array(coverageSchema).max(24),
      }),
    )
    .max(12),
  opportunities: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        description: z.string().min(1).max(800),
        impact: levelSchema,
        effort: levelSchema,
        whyOpen: z.string().min(1).max(800),
      }),
    )
    .max(8),
  recommendations: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        category: recCategorySchema,
        rationale: z.string().min(1).max(800),
        scoreGain: z.number().int().min(0).max(20),
      }),
    )
    .max(10),
  limitations: z.array(z.string().min(1).max(500)).max(12),
});

export type GeminiAnalysis = z.infer<typeof geminiAnalysisSchema>;

export const GEMINI_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "projectSummary",
    "audience",
    "approach",
    "features",
    "distinctivenessScore",
    "scoreExplanation",
    "verdict",
    "similar",
    "opportunities",
    "recommendations",
    "limitations",
  ],
  properties: {
    projectSummary: { type: "string" },
    audience: { type: "string" },
    approach: { type: "string" },
    features: { type: "array", items: { type: "string" } },
    distinctivenessScore: { type: "integer" },
    scoreExplanation: { type: "string" },
    verdict: { type: "string" },
    similar: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "fullName",
          "similarity",
          "reasons",
          "sharedFeatures",
          "distinctiveDifferences",
          "features",
          "audience",
          "approach",
          "cluster",
          "coverage",
        ],
        properties: {
          fullName: { type: "string" },
          similarity: { type: "integer" },
          reasons: { type: "array", items: { type: "string" } },
          sharedFeatures: { type: "array", items: { type: "string" } },
          distinctiveDifferences: { type: "array", items: { type: "string" } },
          features: { type: "array", items: { type: "string" } },
          audience: { type: "string" },
          approach: { type: "string" },
          cluster: { type: "string" },
          coverage: { type: "array", items: { type: "string", enum: ["full", "partial", "none"] } },
        },
      },
    },
    opportunities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "impact", "effort", "whyOpen"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          impact: { type: "string", enum: ["High", "Medium", "Low"] },
          effort: { type: "string", enum: ["High", "Medium", "Low"] },
          whyOpen: { type: "string" },
        },
      },
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "category", "rationale", "scoreGain"],
        properties: {
          title: { type: "string" },
          category: { type: "string", enum: ["Features", "Audience", "Tech", "Positioning"] },
          rationale: { type: "string" },
          scoreGain: { type: "integer" },
        },
      },
    },
    limitations: { type: "array", items: { type: "string" } },
  },
} as const;
