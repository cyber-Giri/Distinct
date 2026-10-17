import { createServerFn } from "@tanstack/react-start";
import { analyzeInputSchema } from "@/lib/analysis-schema";
import type { AnalyzeInput } from "@/lib/types";
import { z } from "zod";

/**
 * RPC wrappers live outside `src/server/` so client modules can import them.
 * Handlers still dynamically load server-only modules, which stay off the browser bundle.
 */
export const getBackendStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getBackendStatus } = await import("@/server/env");
  return getBackendStatus();
});

export const fetchRepoPreviewFn = createServerFn({ method: "POST" })
  .validator((data: { url: string }) => z.object({ url: z.string().min(8).max(300) }).parse(data))
  .handler(async ({ data }) => {
    const { fetchGithubRepoPreview } = await import("@/server/github");
    return fetchGithubRepoPreview(data.url);
  });

export const analyzeProjectFn = createServerFn({ method: "POST" })
  .validator((data: AnalyzeInput) => analyzeInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { runProjectAnalysis } = await import("@/server/analyze");
    return runProjectAnalysis(data);
  });
