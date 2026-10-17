import { getGithubToken } from "./env";

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "insight-spark-innovation-scout";
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "into",
  "using",
  "based",
  "system",
  "app",
  "application",
  "project",
  "platform",
  "tool",
  "tools",
]);

export class GithubApiError extends Error {
  status: number;
  rateLimited: boolean;

  constructor(message: string, status: number, rateLimited = false) {
    super(message);
    this.name = "GithubApiError";
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

export interface ParsedGithubRepo {
  owner: string;
  repo: string;
}

export interface GithubRepoCandidate {
  id: string;
  name: string;
  fullName: string;
  url: string;
  description: string;
  stars: number;
  language: string;
  topics: string[];
  updatedAt: string;
  searchScore: number;
  readme: string;
  relevance: number;
}

export function parseGithubRepoUrl(url: string): ParsedGithubRepo | null {
  const match = url.trim().match(/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  if (!match?.[1] || !match[2]) return null;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");
  if (owner === "." || repo === "." || owner.toLowerCase() === "orgs") return null;
  return { owner, repo };
}

export function tokenizeForSearch(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function buildSearchQueries(input: {
  title: string;
  description: string;
  features: string[];
  techStack: string[];
}): string[] {
  const titleTokens = tokenizeForSearch(input.title).slice(0, 6);
  const descTokens = tokenizeForSearch(input.description).slice(0, 8);
  const featureTokens = tokenizeForSearch(input.features.join(" ")).slice(0, 6);
  const tech = input.techStack.filter(Boolean).slice(0, 3);

  const primary = [...new Set([...titleTokens, ...descTokens.slice(0, 4)])].slice(0, 8).join(" ");
  const secondary = [...new Set([...titleTokens, ...featureTokens, ...tech.map((t) => t.toLowerCase())])]
    .slice(0, 8)
    .join(" ");

  const queries = [primary, secondary].filter((q) => q.trim().length >= 3);
  return [...new Set(queries)].slice(0, 2);
}

export function rankGithubCandidates(
  input: { title: string; description: string; features: string[]; techStack: string[] },
  repos: Omit<GithubRepoCandidate, "relevance">[],
): GithubRepoCandidate[] {
  const queryTokens = [
    ...tokenizeForSearch(input.title),
    ...tokenizeForSearch(input.description).slice(0, 12),
    ...tokenizeForSearch(input.features.join(" ")),
    ...tokenizeForSearch(input.techStack.join(" ")),
  ];

  return repos
    .map((repo) => ({ ...repo, relevance: scoreRepoRelevance(queryTokens, repo) }))
    .sort((a, b) => b.relevance - a.relevance || b.stars - a.stars);
}

export function scoreRepoRelevance(
  queryTokens: string[],
  repo: Omit<GithubRepoCandidate, "relevance">,
): number {
  const hay = [
    repo.name,
    repo.fullName,
    repo.description,
    repo.language,
    repo.topics.join(" "),
    repo.readme.slice(0, 2500),
  ]
    .join(" ")
    .toLowerCase();

  const unique = [...new Set(queryTokens)];
  const hits = unique.filter((token) => hay.includes(token)).length;
  const tokenScore = unique.length ? hits / unique.length : 0;
  const ghScore = Math.min(1, (repo.searchScore || 0) / 80);
  const starBoost = Math.min(1, Math.log10((repo.stars || 0) + 1) / 5);
  const nameBoost = unique.some((token) => repo.name.toLowerCase().includes(token)) ? 0.08 : 0;
  return Number((tokenScore * 0.62 + ghScore * 0.22 + starBoost * 0.08 + nameBoost).toFixed(4));
}

function githubHeaders(accept = "application/vnd.github+json"): HeadersInit {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = getGithubToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function githubFetch(url: string, accept?: string): Promise<Response> {
  const response = await fetch(url, {
    headers: githubHeaders(accept),
    signal: AbortSignal.timeout(12000),
  });
  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    const retry = response.headers.get("retry-after");
    const limited = remaining === "0" || response.status === 429;
    if (limited) {
      throw new GithubApiError(
        `GitHub rate limit reached${retry ? `; retry after ${retry}s` : ""}. Add a GITHUB_TOKEN on the server to raise the limit. No repositories were invented to fill the gap.`,
        response.status,
        true,
      );
    }
  }
  return response;
}

interface GithubSearchItem {
  full_name?: string;
  name?: string;
  html_url?: string;
  description?: string | null;
  stargazers_count?: number;
  language?: string | null;
  topics?: string[];
  updated_at?: string;
  score?: number;
  owner?: { login?: string };
}

type GithubSearchRepo = Omit<GithubRepoCandidate, "relevance" | "readme">;

async function searchGithubPage(query: string, perPage: number, page: number): Promise<{ items: GithubSearchRepo[]; totalCount: number }> {
  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}&page=${page}`;
  const response = await githubFetch(url);
  if (!response.ok) {
    throw new GithubApiError(
      `GitHub search failed (${response.status}). This is a search of public GitHub repositories only, not every project on the internet.`,
      response.status,
    );
  }
  const payload = (await response.json()) as { items?: GithubSearchItem[]; total_count?: number; message?: string };
  const items = (payload.items ?? [])
    .map((item) => {
      const owner = item.owner?.login;
      const name = item.name;
      if (!owner || !name) return null;
      return {
        id: `${owner}/${name}`,
        name,
        fullName: item.full_name ?? `${owner}/${name}`,
        url: item.html_url ?? `https://github.com/${owner}/${name}`,
        description: item.description ?? "",
        stars: item.stargazers_count ?? 0,
        language: item.language ?? "",
        topics: item.topics ?? [],
        updatedAt: (item.updated_at ?? "").slice(0, 10),
        searchScore: item.score ?? 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  return { items, totalCount: payload.total_count ?? items.length };
}

export async function searchGithubRepositories(query: string, perPage = 12, page = 1): Promise<GithubSearchRepo[]> {
  return (await searchGithubPage(query, perPage, page)).items;
}

async function searchAllPages(query: string, keepFirstThousand = false): Promise<{ items: GithubSearchRepo[]; saturated: boolean }> {
  const firstPage = await searchGithubPage(query, 100, 1);
  if (firstPage.totalCount > 1000 && !keepFirstThousand) return { items: [], saturated: true };
  const results = [...firstPage.items];
  // Search permits 1,000 results per query. This helper is used for date
  // partitions, keeping each individual query below that ceiling.
  const pageCount = Math.ceil(Math.min(firstPage.totalCount, 1000) / 100);
  for (let page = 2; page <= pageCount; page += 1) {
    const { items } = await searchGithubPage(query, 100, page);
    results.push(...items);
    if (items.length < 100) break;
  }
  return { items: results, saturated: false };
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function asDateQueryDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function searchDateRange(
  query: string,
  start: Date,
  end: Date,
  onPartition: () => void,
  onItems: (items: GithubSearchRepo[]) => void,
): Promise<Omit<GithubRepoCandidate, "relevance" | "readme">[]> {
  const dateQuery = `${query} created:${asDateQueryDate(start)}..${asDateQueryDate(end)}`;
  onPartition();
  const result = await searchAllPages(dateQuery);
  if (!result.saturated) {
    onItems(result.items);
    return result.items;
  }
  if (start.getTime() === end.getTime()) {
    const items = (await searchAllPages(dateQuery, true)).items;
    onItems(items);
    return items;
  }

  // If a date range fills the 1,000-result window, split it and query both
  // halves. Continue recursively only in saturated ranges to avoid many
  // unnecessary requests for ordinary searches.
  const midpoint = new Date(Math.floor((start.getTime() + end.getTime()) / 2));
  const leftEnd = addUtcDays(midpoint, -1);
  if (leftEnd < start) return items;
  const rightStart = addUtcDays(leftEnd, 1);
  const left = await searchDateRange(query, start, leftEnd, onPartition, onItems);
  const right = await searchDateRange(query, rightStart, end, onPartition, onItems);
  return [...left, ...right];
}

export async function fetchGithubReadme(owner: string, repo: string, maxChars = 4000): Promise<string> {
  const response = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, "application/vnd.github.raw");
  if (response.status === 404) return "";
  if (!response.ok) return "";
  const text = await response.text();
  return text.replace(/\r\n/g, "\n").slice(0, maxChars);
}

export async function fetchGithubRepoPreview(url: string) {
  const parsed = parseGithubRepoUrl(url);
  if (!parsed) throw new Error("Invalid repository URL");
  const response = await githubFetch(`${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}`);
  if (response.status === 404) throw new Error("That public repository was not found.");
  if (!response.ok) {
    throw new GithubApiError(`Could not load that repository from GitHub (${response.status}).`, response.status);
  }
  const repo = (await response.json()) as {
    owner?: { login?: string };
    name?: string;
    description?: string | null;
    stargazers_count?: number;
    language?: string | null;
    topics?: string[];
  };
  return {
    owner: repo.owner?.login ?? parsed.owner,
    name: repo.name ?? parsed.repo,
    description: repo.description ?? "",
    stars: repo.stargazers_count ?? 0,
    language: repo.language ?? "Unknown",
    topics: repo.topics ?? [],
  };
}

export async function discoverRelevantRepos(input: {
  title: string;
  description: string;
  features: string[];
  techStack: string[];
}): Promise<{ candidates: GithubRepoCandidate[]; notes: string[] }> {
  const notes: string[] = [];
  const queries = buildSearchQueries(input);
  if (!queries.length) {
    return {
      candidates: [],
      notes: ["GitHub search was skipped because the proposal did not contain enough searchable terms."],
    };
  }

  const found = new Map<string, Omit<GithubRepoCandidate, "relevance" | "readme">>();
  let partitionsSearched = 0;
  const start = new Date(Date.UTC(2008, 0, 1));
  const end = new Date();
  for (const query of queries) {
    try {
      await searchDateRange(query, start, end, () => {
        partitionsSearched += 1;
      }, (items) => {
        for (const item of items) {
          if (!found.has(item.fullName.toLowerCase())) found.set(item.fullName.toLowerCase(), item);
        }
      });
    } catch (error) {
      if (error instanceof GithubApiError) {
        notes.push(`${error.message} Results gathered before the limit was reached were kept.`);
      } else {
        notes.push("GitHub search stopped unexpectedly. Repositories gathered before the error were kept.");
      }
      break;
    }
  }

  if (!found.size) {
    notes.push(
      "GitHub returned no public repositories for these search terms. This is not a complete search of every public project.",
    );
    return { candidates: [], notes };
  }

  // Rank all discovered metadata first, then fetch READMEs only for the 12
  // candidates supported by the model's structured comparison schema.
  const metadataRanked = rankGithubCandidates(input, [...found.values()].map((repo) => ({ ...repo, readme: "" })));
  const shortlist = metadataRanked.slice(0, 12);
  const withReadme = await Promise.all(
    shortlist.map(async (repo) => {
      const parsed = parseGithubRepoUrl(repo.url);
      const readme = parsed ? await fetchGithubReadme(parsed.owner, parsed.repo).catch(() => "") : "";
      return { ...repo, readme };
    }),
  );

  const ranked = rankGithubCandidates(input, withReadme).slice(0, 12);
  notes.push(
    `Searched ${found.size} unique public GitHub repositories across ${partitionsSearched} query partitions, splitting saturated date ranges to get past GitHub's 1,000-result ceiling per query. Compared the ${ranked.length} highest-ranked candidates. GitHub's search index does not guarantee every project on the internet.`,
  );
  return { candidates: ranked, notes };
}
