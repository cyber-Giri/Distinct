/**
 * All data access for Distinct lives here. Every function is async and returns
 * mock data after a short delay, so a real backend can replace the bodies
 * without touching the UI.
 */
import type { Analysis, AnalyzeInput, Comparison, Coverage, RepoPreview } from "@/lib/types";
import { SAMPLE_ANALYSES } from "./mock-data";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const CREATED_KEY = "distinct:created";
const DELETED_KEY = "distinct:deleted";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

function all(): Analysis[] {
  const deleted = new Set(read<string[]>(DELETED_KEY, []));
  return [...read<Analysis[]>(CREATED_KEY, []), ...SAMPLE_ANALYSES].filter((a) => !deleted.has(a.id));
}

export async function listAnalyses(): Promise<Analysis[]> {
  await delay(500);
  return all().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAnalysis(id: string): Promise<Analysis> {
  await delay(600);
  const found = all().find((a) => a.id === id);
  if (!found) throw new Error("We couldn't find that analysis. It may have been deleted.");
  return found;
}

export async function deleteAnalysis(id: string): Promise<void> {
  await delay(300);
  write(DELETED_KEY, [...read<string[]>(DELETED_KEY, []), id]);
}

export async function fetchRepoPreview(url: string): Promise<RepoPreview> {
  await delay(700);
  const m = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  if (!m) throw new Error("Invalid repository URL");
  const owner = m[1] ?? "owner";
  const name = m[2] ?? "repo";
  const seed = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  const langs = ["TypeScript", "Python", "Go", "JavaScript", "Rust"];
  return {
    owner,
    name,
    description: `${name.replace(/[-_]/g, " ")} — a project by ${owner}.`,
    stars: (seed * 37) % 4800 + 40,
    language: langs[seed % langs.length] ?? "TypeScript",
    topics: ["open-source", (name.split(/[-_]/)[0] ?? name).toLowerCase(), (langs[seed % langs.length] ?? "code").toLowerCase()],
  };
}

export async function analyzeProject(input: AnalyzeInput): Promise<Analysis> {
  await delay(3600);
  const template = SAMPLE_ANALYSES[input.title.length % SAMPLE_ANALYSES.length]!;
  const features = input.features.length ? input.features : template.features;
  const levels: Coverage[] = ["full", "partial", "none", "none", "partial"];
  const score = 35 + ((input.title.length * 7 + features.length * 11) % 55);
  const analysis: Analysis = {
    ...template,
    id: `a-${Date.now().toString(36)}`,
    title: input.title || "Untitled project",
    type: input.type,
    repoUrl: input.repoUrl,
    createdAt: new Date().toISOString(),
    description: input.description || template.description,
    techStack: input.techStack.length ? input.techStack : template.techStack,
    features,
    score,
    verdict:
      score >= 60
        ? "A strong, distinctive concept with a few crowded areas to watch."
        : "Several close matches exist. Focus on the opportunities below to stand out.",
    similar: template.similar.map((p, j) => ({
      ...p,
      id: `${p.id}-${j}`,
      coverage: features.map((_, i) => levels[(i + j * 2) % levels.length] ?? "none"),
    })),
  };
  write(CREATED_KEY, [analysis, ...read<Analysis[]>(CREATED_KEY, [])]);
  return analysis;
}

const norm = (s: string) => s.toLowerCase().trim();

export async function compareProjects(analysisId: string, projectId: string): Promise<Comparison> {
  const analysis = await getAnalysis(analysisId);
  const project = analysis.similar.find((p) => p.id === projectId);
  if (!project) throw new Error("That similar project isn't part of this analysis.");
  const theirTech = new Set(project.tech.map(norm));
  const myTech = new Set(analysis.techStack.map(norm));
  const sharedFeatures = analysis.features.filter((_, i) => project.coverage[i] === "full");
  const uniqueFeatures = analysis.features.filter((_, i) => project.coverage[i] === "none");
  const sameAudience = norm(project.audience).split(" ").some((w) => w.length > 4 && norm(analysis.audience).includes(w));

  return {
    analysis,
    project,
    rows: [
      {
        label: "Description",
        mine: [{ text: analysis.description, match: false }],
        theirs: [{ text: project.description, match: false }],
      },
      {
        label: "Features",
        mine: analysis.features.map((f, i) => ({ text: f, match: project.coverage[i] === "full" })),
        theirs: project.features.map((f) => ({ text: f, match: false })),
      },
      {
        label: "Tech stack",
        mine: analysis.techStack.map((t) => ({ text: t, match: theirTech.has(norm(t)) })),
        theirs: project.tech.map((t) => ({ text: t, match: myTech.has(norm(t)) })),
      },
      {
        label: "Target audience",
        mine: [{ text: analysis.audience, match: sameAudience }],
        theirs: [{ text: project.audience, match: sameAudience }],
      },
      {
        label: "Approach",
        mine: [{ text: analysis.approach, match: false }],
        theirs: [{ text: project.approach, match: false }],
      },
    ],
    summary: [
      `${project.name} overlaps with you on ${sharedFeatures.length} of ${analysis.features.length} features${
        sharedFeatures.length ? `, mainly ${sharedFeatures.slice(0, 2).join(" and ").toLowerCase()}` : ""
      }.`,
      uniqueFeatures.length
        ? `You offer ${uniqueFeatures.join(", ").toLowerCase()}, which ${project.name} doesn't have at all.`
        : `Most of your features exist in ${project.name} in some form, so differentiation must come from audience or approach.`,
      `Your approach — ${analysis.approach.toLowerCase()} — differs from theirs: ${project.approach.toLowerCase()}.`,
      sameAudience
        ? "You target a very similar audience, so lead with your unique features in any pitch."
        : `They focus on ${project.audience.toLowerCase()}, leaving room for you with ${analysis.audience.toLowerCase()}.`,
    ],
  };
}
