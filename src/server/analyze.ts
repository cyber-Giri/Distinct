import type { Analysis, AnalyzeInput, SimilarProject } from "@/lib/types";
import { analyzeInputSchema } from "@/lib/analysis-schema";
import { analyzeWithGemini } from "./gemini";
import { discoverRelevantRepos, fetchGithubRepoPreview, parseGithubRepoUrl, type GithubRepoCandidate } from "./github";

const SENSITIVITY_MIN_SIM = [55, 40, 25] as const;

export function normalizeAnalyzeInput(raw: AnalyzeInput): AnalyzeInput {
  const parsed = analyzeInputSchema.parse(raw);
  return {
    ...parsed,
    techStack: parsed.techStack.map((item) => item.trim()).filter(Boolean),
    features: parsed.features.map((item) => item.trim()).filter(Boolean),
    sources: parsed.sources.map((item) => item.trim()).filter(Boolean),
  };
}

function coverageFor(features: string[], coverage: Array<"full" | "partial" | "none"> | undefined): Array<"full" | "partial" | "none"> {
  return features.map((_, index) => coverage?.[index] ?? "none");
}

function mapSimilar(
  features: string[],
  candidates: GithubRepoCandidate[],
  minSimilarity: number,
  items: Awaited<ReturnType<typeof analyzeWithGemini>>["similar"],
): SimilarProject[] {
  const byName = new Map(candidates.map((repo) => [repo.fullName.toLowerCase(), repo]));
  const used = new Set<string>();
  const mapped: SimilarProject[] = [];

  for (const item of items) {
    const candidate = byName.get(item.fullName.toLowerCase());
    if (!candidate || used.has(candidate.fullName.toLowerCase())) continue;
    if (item.similarity < minSimilarity) continue;
    used.add(candidate.fullName.toLowerCase());
    const differences = item.distinctiveDifferences.slice(0, 3);
    mapped.push({
      id: candidate.fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
      name: candidate.fullName,
      source: "github",
      description: candidate.description || item.approach,
      stars: candidate.stars,
      tech: [...new Set([candidate.language, ...candidate.topics].filter(Boolean))].slice(0, 6),
      similarity: item.similarity,
      updatedAt: candidate.updatedAt || new Date().toISOString().slice(0, 10),
      reasons: item.reasons,
      features: item.features.length ? item.features : item.sharedFeatures,
      audience: item.audience,
      approach: item.approach,
      cluster: item.cluster,
      coverage: coverageFor(features, item.coverage),
      url: candidate.url,
    });
    if (differences.length && mapped[mapped.length - 1]) {
      const last = mapped[mapped.length - 1]!;
      last.reasons = [
        ...last.reasons,
        ...differences.map((diff) => `Difference: ${diff}`),
      ].slice(0, 8);
    }
  }

  return mapped.sort((a, b) => b.similarity - a.similarity);
}

export async function runProjectAnalysis(raw: AnalyzeInput): Promise<Analysis> {
  const input = normalizeAnalyzeInput(raw);
  const notes: string[] = [];

  if (input.type === "github" && input.repoUrl) {
    const preview = await fetchGithubRepoPreview(input.repoUrl);
    if (!input.title.trim()) input.title = `${preview.owner}/${preview.name}`;
    if (!input.description.trim()) input.description = preview.description;
    if (!input.techStack.length) {
      input.techStack = [preview.language, ...preview.topics].filter(Boolean).slice(0, 6);
    }
    const parsed = parseGithubRepoUrl(input.repoUrl);
    if (parsed) {
      const { fetchGithubReadme } = await import("./github");
      const readme = await fetchGithubReadme(parsed.owner, parsed.repo).catch(() => "");
      if (readme) {
        input.description = `${input.description}\n\nREADME excerpt:\n${readme.slice(0, 2500)}`.trim();
      }
    }
  }

  const wantsGithub = input.sources.length === 0 || input.sources.some((source) => /github/i.test(source));
  const skipped = input.sources.filter((source) => !/github/i.test(source));
  if (skipped.length) {
    notes.push(
      `Requested sources not searched in this version: ${skipped.join(", ")}. Only the GitHub REST API was queried.`,
    );
  }

  let candidates: GithubRepoCandidate[] = [];
  if (wantsGithub) {
    const discovered = await discoverRelevantRepos({
      title: input.title,
      description: input.description,
      features: input.features,
      techStack: input.techStack,
    });
    candidates = discovered.candidates;
    notes.push(...discovered.notes);
  } else {
    notes.push("GitHub search was turned off in Compare against, so no public repositories were retrieved.");
  }

  const gemini = await analyzeWithGemini(input, candidates);
  const features = input.features.length ? input.features : gemini.features.slice(0, 8);
  const similar = mapSimilar(features, candidates, SENSITIVITY_MIN_SIM[input.sensitivity] ?? 40, gemini.similar);

  const limitations = [
    ...notes,
    ...gemini.limitations,
    "Results are based on GitHub search matches plus model comparison, not an exhaustive scan of every public repository.",
  ].filter((item, index, all) => item && all.indexOf(item) === index);

  return {
    id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title,
    type: input.type,
    ...(input.repoUrl ? { repoUrl: input.repoUrl } : {}),
    createdAt: new Date().toISOString(),
    status: "completed",
    description: input.description.length > 600 ? `${input.description.slice(0, 597)}...` : input.description,
    techStack: input.techStack,
    features,
    audience: gemini.audience,
    approach: gemini.approach,
    score: gemini.distinctivenessScore,
    verdict: gemini.verdict,
    similar,
    opportunities: gemini.opportunities.map((item, index) => ({
      id: `o${index + 1}`,
      title: item.title,
      description: item.description,
      impact: item.impact,
      effort: item.effort,
      whyOpen: item.whyOpen,
    })),
    recommendations: gemini.recommendations.map((item, index) => ({
      id: `r${index + 1}`,
      title: item.title,
      category: item.category,
      rationale: item.rationale,
      scoreGain: item.scoreGain,
    })),
    summary: gemini.projectSummary,
    scoreExplanation: gemini.scoreExplanation,
    limitations,
    isDemo: false,
  };
}
