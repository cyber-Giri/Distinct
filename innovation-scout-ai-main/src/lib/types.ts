export type InputType = "proposal" | "github";
export type Source = "github" | "devpost";
export type Coverage = "full" | "partial" | "none";
export type Level = "High" | "Medium" | "Low";
export type RecCategory = "Features" | "Audience" | "Tech" | "Positioning";

export interface SimilarProject {
  id: string;
  name: string;
  source: Source;
  description: string;
  stars: number;
  tech: string[];
  similarity: number;
  updatedAt: string;
  reasons: string[];
  features: string[];
  audience: string;
  approach: string;
  cluster: string;
  /** Coverage of each of the analysed project's features, aligned by index. */
  coverage: Coverage[];
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  impact: Level;
  effort: Level;
  whyOpen: string;
}

export interface Recommendation {
  id: string;
  title: string;
  category: RecCategory;
  rationale: string;
  scoreGain: number;
}

export interface Analysis {
  id: string;
  title: string;
  type: InputType;
  repoUrl?: string | undefined;
  createdAt: string;
  status: "completed" | "processing" | "failed";
  description: string;
  techStack: string[];
  features: string[];
  audience: string;
  approach: string;
  score: number;
  verdict: string;
  similar: SimilarProject[];
  opportunities: Opportunity[];
  recommendations: Recommendation[];
}

export interface AnalyzeInput {
  type: InputType;
  title: string;
  description: string;
  techStack: string[];
  features: string[];
  repoUrl?: string | undefined;
  sources: string[];
  sensitivity: number;
}

export interface RepoPreview {
  owner: string;
  name: string;
  description: string;
  stars: number;
  language: string;
  topics: string[];
}

export interface CompareRow {
  label: string;
  mine: { text: string; match: boolean }[];
  theirs: { text: string; match: boolean }[];
}

export interface Comparison {
  analysis: Analysis;
  project: SimilarProject;
  rows: CompareRow[];
  summary: string[];
}
