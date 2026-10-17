import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./gemini", () => ({
  analyzeWithGemini: vi.fn(),
}));

vi.mock("./github", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./github")>();
  return {
    ...actual,
    fetchGithubRepoPreview: vi.fn(),
    discoverRelevantRepos: vi.fn(),
    fetchGithubReadme: vi.fn(),
  };
});

import { analyzeWithGemini } from "./gemini";
import { discoverRelevantRepos, fetchGithubRepoPreview } from "./github";
import { runProjectAnalysis } from "./analyze";

const geminiResult = {
  projectSummary: "Summary of the planner.",
  audience: "Students",
  approach: "Adaptive scheduling",
  features: ["AI schedules"],
  distinctivenessScore: 61,
  scoreExplanation: "61 means moderately distinctive versus the listed GitHub repos.",
  verdict: "Room to stand out if syllabus parsing is the headline.",
  similar: [
    {
      fullName: "acme/studyflow-ai",
      similarity: 80,
      reasons: ["Both generate study plans."],
      sharedFeatures: ["AI schedules"],
      distinctiveDifferences: ["No syllabus PDF parsing."],
      features: ["AI timetable"],
      audience: "Students",
      approach: "One-shot plan",
      cluster: "AI schedulers",
      coverage: ["full" as const],
    },
    {
      fullName: "invented/not-real",
      similarity: 99,
      reasons: ["Should be dropped."],
      sharedFeatures: [],
      distinctiveDifferences: [],
      features: ["x"],
      audience: "x",
      approach: "x",
      cluster: "x",
      coverage: ["full" as const],
    },
  ],
  opportunities: [
    {
      title: "Burnout-aware planning",
      description: "Use wellbeing signals.",
      impact: "High" as const,
      effort: "Medium" as const,
      whyOpen: "Not present in listed repos.",
    },
  ],
  recommendations: [
    {
      title: "Lead with syllabus parsing",
      category: "Positioning" as const,
      rationale: "Unclaimed in the candidate set.",
      scoreGain: 6,
    },
  ],
  limitations: ["Only GitHub search candidates were compared."],
};

describe("runProjectAnalysis", () => {
  beforeEach(() => {
    vi.mocked(analyzeWithGemini).mockReset();
    vi.mocked(discoverRelevantRepos).mockReset();
    vi.mocked(fetchGithubRepoPreview).mockReset();
  });

  it("keeps only Gemini comparisons that match real GitHub candidates", async () => {
    vi.mocked(discoverRelevantRepos).mockResolvedValue({
      candidates: [
        {
          id: "acme/studyflow-ai",
          name: "studyflow-ai",
          fullName: "acme/studyflow-ai",
          url: "https://github.com/acme/studyflow-ai",
          description: "AI study planner",
          stars: 120,
          language: "TypeScript",
          topics: ["react"],
          updatedAt: "2026-01-01",
          searchScore: 40,
          readme: "study schedules",
          relevance: 0.8,
        },
      ],
      notes: ["Compared against 1 public GitHub repository."],
    });
    vi.mocked(analyzeWithGemini).mockResolvedValue(geminiResult);

    const analysis = await runProjectAnalysis({
      type: "proposal",
      title: "AI Study Planner",
      description: "Turns a syllabus into an adaptive weekly study plan.",
      techStack: ["React"],
      features: ["AI schedules"],
      sources: ["GitHub"],
      sensitivity: 1,
    });

    expect(analysis.isDemo).toBe(false);
    expect(analysis.similar).toHaveLength(1);
    expect(analysis.similar[0]?.name).toBe("acme/studyflow-ai");
    expect(analysis.similar[0]?.url).toBe("https://github.com/acme/studyflow-ai");
    expect(analysis.score).toBe(61);
    expect(analysis.limitations?.some((item) => /not an exhaustive/i.test(item))).toBe(true);
  });

  it("does not fabricate repositories when GitHub returns none", async () => {
    vi.mocked(discoverRelevantRepos).mockResolvedValue({
      candidates: [],
      notes: ["GitHub returned no public repositories for these search terms."],
    });
    vi.mocked(analyzeWithGemini).mockResolvedValue({ ...geminiResult, similar: [] });

    const analysis = await runProjectAnalysis({
      type: "proposal",
      title: "AI Study Planner",
      description: "Turns a syllabus into an adaptive weekly study plan.",
      techStack: ["React"],
      features: ["AI schedules"],
      sources: ["GitHub"],
      sensitivity: 1,
    });

    expect(analysis.similar).toEqual([]);
    expect(analysis.isDemo).toBe(false);
  });
});
