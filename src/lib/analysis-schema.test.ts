import { describe, expect, it } from "vitest";
import { analyzeInputSchema } from "./analysis-schema";

describe("analyze input validation", () => {
  it("accepts a complete proposal", () => {
    const parsed = analyzeInputSchema.parse({
      type: "proposal",
      title: "AI Study Planner",
      description: "Turns a syllabus into an adaptive weekly study plan.",
      techStack: ["React"],
      features: ["Calendar sync"],
      sources: ["GitHub"],
      sensitivity: 1,
    });
    expect(parsed.title).toBe("AI Study Planner");
  });

  it("rejects a proposal that is too short", () => {
    const result = analyzeInputSchema.safeParse({
      type: "proposal",
      title: "AI",
      description: "Too short",
      techStack: [],
      features: [],
      sources: [],
      sensitivity: 1,
    });
    expect(result.success).toBe(false);
  });
});
