import { afterEach, describe, expect, it } from "vitest";
import { getBackendStatus, getGeminiApiKey, requireGeminiApiKey } from "./env";

const ORIGINAL = process.env["GEMINI_API_KEY"];

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env["GEMINI_API_KEY"];
  else process.env["GEMINI_API_KEY"] = ORIGINAL;
});

describe("server env", () => {
  it("reads GEMINI_API_KEY from process.env without exposing a default key", () => {
    process.env["GEMINI_API_KEY"] = "test-key-123";
    expect(getGeminiApiKey()).toBe("test-key-123");
    expect(getBackendStatus()).toEqual({ geminiConfigured: true, githubTokenConfigured: Boolean(process.env["GITHUB_TOKEN"]) });
  });

  it("treats blank keys as missing", () => {
    process.env["GEMINI_API_KEY"] = "   ";
    expect(getGeminiApiKey()).toBeUndefined();
    expect(() => requireGeminiApiKey()).toThrow(/not configured/i);
  });
});
