import { describe, expect, it } from "vitest";
import { extractJsonObject, parseGeminiAnalysis } from "./gemini";

const valid = {
  projectSummary: "A planner that adapts around missed study sessions.",
  audience: "University students",
  approach: "LLM plus spaced repetition",
  features: ["AI schedules", "Calendar sync"],
  distinctivenessScore: 58,
  scoreExplanation: "58/100 distinctiveness means several close public repos exist; higher would mean fewer overlaps.",
  verdict: "Crowded core with a few openings.",
  similar: [
    {
      fullName: "owner/studyflow",
      similarity: 81,
      reasons: ["Both generate weekly study plans from courses."],
      sharedFeatures: ["AI schedules"],
      distinctiveDifferences: ["They do not parse syllabi."],
      features: ["AI timetable"],
      audience: "Students",
      approach: "One-shot LLM plan",
      cluster: "AI schedulers",
      coverage: ["full", "partial"],
    },
  ],
  opportunities: [
    {
      title: "Burnout-aware planning",
      description: "Adjust load from wellbeing signals.",
      impact: "High",
      effort: "Medium",
      whyOpen: "None of the supplied repos use wellbeing data.",
    },
  ],
  recommendations: [
    {
      title: "Lead with syllabus parsing",
      category: "Positioning",
      rationale: "No listed repo markets this as the headline.",
      scoreGain: 6,
    },
  ],
  limitations: ["Only the supplied GitHub candidates were compared."],
};

describe("Gemini JSON validation", () => {
  it("parses structured JSON from a fenced response", () => {
    const parsed = parseGeminiAnalysis("```json\n" + JSON.stringify(valid) + "\n```");
    expect(parsed.distinctivenessScore).toBe(58);
    expect(parsed.similar[0]?.fullName).toBe("owner/studyflow");
  });

  it("rejects invented-looking payloads that fail the schema", () => {
    expect(() => parseGeminiAnalysis(JSON.stringify({ projectSummary: "nope" }))).toThrow(/validation/i);
  });

  it("rejects non-JSON model output", () => {
    expect(() => extractJsonObject("sorry, I cannot help")).toThrow(/non-JSON/i);
  });
});
