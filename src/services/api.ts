/**
 * Client data access for Distinct. Analysis creation and GitHub previews go
 * through TanStack Start server functions so GEMINI_API_KEY never reaches the browser.
 * History remains in localStorage so reports stay available without a database.
 */
import type { Analysis, AnalyzeInput, Comparison, RepoPreview } from "@/lib/types";
import { SAMPLE_ANALYSES } from "./mock-data";
import { analyzeProjectFn, fetchRepoPreviewFn } from "@/lib/server-functions";

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
  return all().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAnalysis(id: string): Promise<Analysis> {
  const found = all().find((a) => a.id === id);
  if (!found) throw new Error("We couldn't find that analysis. It may have been deleted.");
  return found;
}

export async function deleteAnalysis(id: string): Promise<void> {
  write(DELETED_KEY, [...read<string[]>(DELETED_KEY, []), id]);
}

export async function fetchRepoPreview(url: string): Promise<RepoPreview> {
  return fetchRepoPreviewFn({ data: { url } });
}

export async function analyzeProject(input: AnalyzeInput): Promise<Analysis> {
  const analysis = await analyzeProjectFn({ data: input });
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
