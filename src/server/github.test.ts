import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GithubApiError,
  buildSearchQueries,
  parseGithubRepoUrl,
  rankGithubCandidates,
  searchGithubRepositories,
} from "./github";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GitHub repository discovery", () => {
  it("parses owner/repo from common GitHub URLs", () => {
    expect(parseGithubRepoUrl("https://github.com/acme/study-planner")).toEqual({
      owner: "acme",
      repo: "study-planner",
    });
    expect(parseGithubRepoUrl("not-a-url")).toBeNull();
  });

  it("ranks candidates by keyword overlap before Gemini comparison", () => {
    const ranked = rankGithubCandidates(
      {
        title: "AI Study Planner",
        description: "Adaptive study schedules with spaced repetition",
        features: ["calendar sync"],
        techStack: ["React"],
      },
      [
        {
          id: "other/notes",
          name: "notes",
          fullName: "other/notes",
          url: "https://github.com/other/notes",
          description: "A markdown editor",
          stars: 9000,
          language: "Go",
          topics: [],
          updatedAt: "2026-01-01",
          searchScore: 90,
          readme: "edit notes",
        },
        {
          id: "acme/studyflow-ai",
          name: "studyflow-ai",
          fullName: "acme/studyflow-ai",
          url: "https://github.com/acme/studyflow-ai",
          description: "AI study planner with spaced repetition and calendar sync",
          stars: 120,
          language: "TypeScript",
          topics: ["react"],
          updatedAt: "2026-01-01",
          searchScore: 20,
          readme: "Builds adaptive study schedules",
        },
      ],
    );
    expect(ranked[0]?.fullName).toBe("acme/studyflow-ai");
    expect(ranked[0]!.relevance).toBeGreaterThan(ranked[1]!.relevance);
  });

  it("builds non-empty GitHub search queries from a proposal", () => {
    const queries = buildSearchQueries({
      title: "Campus Event Finder",
      description: "Aggregate student club events into one feed",
      features: ["RSVP"],
      techStack: ["React Native"],
    });
    expect(queries.length).toBeGreaterThan(0);
    expect(queries[0]?.length).toBeGreaterThan(3);
  });

  it("returns an empty list when GitHub search has no items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ items: [] }),
      }),
    );
    await expect(searchGithubRepositories("zzzz-no-such-project-xyz")).resolves.toEqual([]);
  });

  it("surfaces GitHub rate limits without inventing matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ "x-ratelimit-remaining": "0" }),
        json: async () => ({ message: "API rate limit exceeded" }),
      }),
    );
    await expect(searchGithubRepositories("study planner")).rejects.toBeInstanceOf(GithubApiError);
    await expect(searchGithubRepositories("study planner")).rejects.toThrow(/rate limit/i);
  });
});
