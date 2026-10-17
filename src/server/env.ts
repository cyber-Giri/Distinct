function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function getGeminiApiKey(): string | undefined {
  return readEnv("GEMINI_API_KEY");
}

export function getGithubToken(): string | undefined {
  return readEnv("GITHUB_TOKEN");
}

export function requireGeminiApiKey(): string {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error(
      "Gemini is not configured. Set the GEMINI_API_KEY environment variable on the server. This analysis was not replaced with demo data.",
    );
  }
  return key;
}

export function getBackendStatus() {
  return {
    geminiConfigured: Boolean(getGeminiApiKey()),
    githubTokenConfigured: Boolean(getGithubToken()),
  };
}
