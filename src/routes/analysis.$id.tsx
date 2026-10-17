import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Download, FileText, Github, Lightbulb, RefreshCw, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureMatrix } from "@/components/distinct/FeatureMatrix";
import { ProjectCard } from "@/components/distinct/ProjectCard";
import { ErrorState, Page, PageSkeleton, ScoreGauge } from "@/components/distinct/shared";
import { formatDate, landscape, mostSaturated, overlappingCount, projectedScore, saturation } from "@/lib/analysis-utils";
import type { Analysis, Level, Source } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getAnalysis } from "@/services/api";

const analysisQuery = (id: string) => queryOptions({ queryKey: ["analysis", id], queryFn: () => getAnalysis(id) });
const adoptedKey = (id: string) => `distinct:adopted:${id}`;

export const Route = createFileRoute("/analysis/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(analysisQuery(params.id)),
  ssr: false,
  pendingMs: 0,
  head: ({ params }) => ({
    meta: [
      { title: `Analysis — Distinct` },
      { name: "description", content: `Originality report for analysis ${params.id}.` },
      { property: "og:title", content: "Analysis — Distinct" },
      { property: "og:description", content: "See similar projects, overlapping features and ways to stand out." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: () => <PageSkeleton cards={3} />,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  notFoundComponent: () => <Page>Not found</Page>,
  component: AnalysisPage,
});

function AnalysisPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(analysisQuery(id));
  return <Report analysis={data} />;
}

function Report({ analysis }: { analysis: Analysis }) {
  const navigate = useNavigate();
  const maxSim = Math.max(0, ...analysis.similar.map((p) => p.similarity));
  const overlap = overlappingCount(analysis);
  const saturated = mostSaturated(analysis);
  const sat = saturation(analysis);
  const { points, labels } = landscape(analysis);
  const [source, setSource] = useState<"all" | Source>("all");
  const [minSim, setMinSim] = useState(0);
  const [sort, setSort] = useState("similarity");
  const [adopted, setAdopted] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(adoptedKey(analysis.id)) ?? "[]") as string[];
      setAdopted(new Set(raw));
    } catch {
      setAdopted(new Set());
    }
  }, [analysis.id]);

  const toggleAdopted = (recId: string) => {
    setAdopted((prev) => {
      const next = new Set(prev);
      if (next.has(recId)) next.delete(recId);
      else next.add(recId);
      localStorage.setItem(adoptedKey(analysis.id), JSON.stringify([...next]));
      return next;
    });
  };

  const similar = useMemo(() => {
    const filtered = analysis.similar.filter((p) => (source === "all" || p.source === source) && p.similarity >= minSim);
    const cmp = {
      similarity: (a: (typeof filtered)[number], b: (typeof filtered)[number]) => b.similarity - a.similarity,
      stars: (a: (typeof filtered)[number], b: (typeof filtered)[number]) => b.stars - a.stars,
      recency: (a: (typeof filtered)[number], b: (typeof filtered)[number]) => b.updatedAt.localeCompare(a.updatedAt),
    }[sort]!;
    return [...filtered].sort(cmp);
  }, [analysis.similar, source, minSim, sort]);

  const projected = projectedScore(analysis, adopted);
  const adoptedCount = analysis.recommendations.filter((r) => adopted.has(r.id)).length;

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <Page>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1 font-normal">
              {analysis.type === "github" ? <Github className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              {analysis.type === "github" ? "Repository" : "Proposal"}
            </Badge>
            <span className="text-sm text-muted-foreground">{formatDate(analysis.createdAt)}</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{analysis.title}</h1>
          {analysis.isDemo && (
            <p className="mt-2 rounded-md bg-warning/15 px-3 py-2 text-sm">
              <span className="font-medium">Demo data. </span>
              {analysis.demoReason ?? "This report is sample content, not a live GitHub or Gemini analysis."}
            </p>
          )}
          {analysis.summary && <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{analysis.summary}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => toast.success("PDF export is mocked for the demo")}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={share}>
            <Share2 className="mr-1.5 h-4 w-4" /> Share
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/analyze" })}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Re-analyze
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-soft">
          <ScoreGauge score={analysis.score} size={120} />
          <div>
            <p className="text-sm text-muted-foreground">Distinctiveness Score</p>
            <p className="mt-1 text-sm">{analysis.verdict}</p>
            {analysis.scoreExplanation && <p className="mt-2 text-xs text-muted-foreground">{analysis.scoreExplanation}</p>}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground">Similar Projects Found</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{analysis.similar.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Highest similarity {maxSim}%</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground">Overlapping Features</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{overlap}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Most saturated: <span className="font-medium text-foreground">{saturated}</span>
          </p>
        </div>
      </div>

      <Tabs defaultValue="similar" className="mt-8">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="similar">Similar Projects</TabsTrigger>
          <TabsTrigger value="overlap">Feature Overlap</TabsTrigger>
          <TabsTrigger value="landscape">Idea Landscape</TabsTrigger>
          <TabsTrigger value="opportunities">Innovation Opportunities</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="similar" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-44">
              <p className="mb-1.5 text-xs text-muted-foreground">Source</p>
              <Select value={source} onValueChange={(v) => setSource(v as "all" | Source)}>
                <SelectTrigger aria-label="Filter by source"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="devpost">Devpost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-44">
              <p className="mb-1.5 text-xs text-muted-foreground">Sort</p>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger aria-label="Sort similar projects"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="similarity">Similarity</SelectItem>
                  <SelectItem value="stars">Stars</SelectItem>
                  <SelectItem value="recency">Recency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Min similarity</span>
                <span className="font-mono">{minSim}%</span>
              </div>
              <Slider min={0} max={90} step={5} value={[minSim]} onValueChange={([v]) => setMinSim(v ?? 0)} aria-label="Minimum similarity" />
            </div>
          </div>
          {similar.length === 0 ? (
            <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">No similar projects match those filters.</p>
          ) : (
            <div className="grid gap-4">
              {similar.map((p) => (
                <ProjectCard key={p.id} project={p} analysisId={analysis.id} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overlap" className="mt-6 space-y-6">
          <FeatureMatrix analysis={analysis} />
          <div className="rounded-xl border bg-card p-5 shadow-soft">
            <h2 className="font-semibold">Feature saturation</h2>
            <p className="mt-1 text-sm text-muted-foreground">How common each of your features is across similar projects.</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sat} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="feature" width={160} stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Saturation"]} />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="landscape" className="mt-6">
          <div className="rounded-xl border bg-card p-5 shadow-soft">
            <h2 className="font-semibold">Idea landscape</h2>
            <p className="mt-1 text-sm text-muted-foreground">Closer to the centre means more similar to your project.</p>
            <div className="relative mt-4 h-80">
              {labels.map((l) => (
                <span
                  key={l.cluster}
                  className="pointer-events-none absolute z-10 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  style={{ left: `${l.x}%`, top: `${l.y}%`, transform: "translate(-50%, -120%)" }}
                >
                  {l.cluster}
                </span>
              ))}
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
                  <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                    formatter={(_v, _n, item) => {
                      const p = item.payload as { name?: string; similarity?: number };
                      return [`${p.similarity ?? 100}% similar`, p.name ?? "Your project"];
                    }}
                  />
                  <Scatter name="Similar" data={points} fill="var(--primary)">
                    {points.map((p) => (
                      <Cell key={p.id} fill="var(--primary)" fillOpacity={0.7} />
                    ))}
                  </Scatter>
                  <Scatter name="Yours" data={[{ x: 50, y: 50, name: analysis.title, similarity: 100 }]} fill="var(--primary-glow)" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-6 grid gap-4 md:grid-cols-2">
          {analysis.opportunities.map((o) => (
            <article key={o.id} className="rounded-xl border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  {o.title}
                </h3>
                <div className="flex gap-1.5">
                  <LevelBadge kind="Impact" level={o.impact} />
                  <LevelBadge kind="Effort" level={o.effort} />
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{o.description}</p>
              <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
                <span className="font-medium">Why this is open: </span>
                {o.whyOpen}
              </p>
            </article>
          ))}
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6 space-y-5">
          <div className="rounded-xl border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Adopted {adoptedCount} of {analysis.recommendations.length}</p>
                <Progress value={analysis.recommendations.length ? (adoptedCount / analysis.recommendations.length) * 100 : 0} className="mt-2 w-56" />
              </div>
              <p className="text-sm">
                Projected distinctiveness <span className="text-2xl font-semibold tabular-nums">{projected}</span>
                <span className="ml-1 text-muted-foreground">from {analysis.score}</span>
              </p>
            </div>
          </div>
          <ul className="space-y-3">
            {analysis.recommendations.map((r, i) => (
              <RecommendationRow key={r.id} index={i} rec={r} checked={adopted.has(r.id)} onToggle={() => toggleAdopted(r.id)} />
            ))}
          </ul>
        </TabsContent>
      </Tabs>
      {analysis.limitations?.length ? (
        <section className="mt-8 rounded-xl border bg-card p-5 text-sm shadow-soft">
          <h2 className="font-semibold">Limitations and confidence</h2>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            {analysis.limitations.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Page>
  );
}

function LevelBadge({ kind, level }: { kind: string; level: Level }) {
  const tone = level === "High" ? "bg-destructive/15 text-destructive" : level === "Medium" ? "bg-warning/20 text-warning-foreground" : "bg-muted text-muted-foreground";
  return <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", tone)}>{kind} {level}</span>;
}

function RecommendationRow({
  rec,
  checked,
  onToggle,
  index,
}: {
  rec: Analysis["recommendations"][number];
  checked: boolean;
  onToggle: () => void;
  index: number;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <li className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={`Adopt: ${rec.title}`} className="mt-1" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("font-medium", checked && "text-muted-foreground line-through")}>{rec.title}</p>
            <Badge variant="secondary" className="font-normal">{rec.category}</Badge>
            <span className="font-mono text-xs text-muted-foreground">+{rec.scoreGain}</span>
          </div>
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="-ml-2 mt-1" aria-expanded={open}>
                Rationale
                <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", open && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="text-sm text-muted-foreground">{rec.rationale}</p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </li>
  );
}
