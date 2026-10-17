import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Github, Loader2, Plus, Sparkles, Star, X } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSteps, Page } from "@/components/distinct/shared";
import { analyzeProject, fetchRepoPreview } from "@/services/api";
import type { InputType, RepoPreview } from "@/lib/types";
import { formatStars } from "@/lib/analysis-utils";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze a project — Distinct" },
      { name: "description", content: "Submit a project proposal or GitHub repository for an AI originality analysis." },
      { property: "og:title", content: "Analyze a project — Distinct" },
      { property: "og:description", content: "Get an originality report for your idea or repo in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyzePage,
});

const SOURCES = ["GitHub", "Devpost", "Public project database", "My previous analyses"];
const SENS = ["Strict", "Balanced", "Broad"];
const MAX = 2000;
const REPO_RE = /^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i;

function AnalyzePage() {
  const navigate = useNavigate();
  const [type, setType] = useState<InputType>("proposal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [featureDraft, setFeatureDraft] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [repo, setRepo] = useState<RepoPreview | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [sources, setSources] = useState<string[]>(["GitHub", "Devpost"]);
  const [sens, setSens] = useState(1);
  const [running, setRunning] = useState(false);

  const repoValid = REPO_RE.test(repoUrl.trim());

  useEffect(() => {
    setRepo(null);
    if (!repoValid) return;
    setRepoLoading(true);
    const t = setTimeout(() => {
      fetchRepoPreview(repoUrl)
        .then(setRepo)
        .catch(() => toast.error("Couldn't load that repository"))
        .finally(() => setRepoLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [repoUrl, repoValid]);

  const addTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagDraft.trim()) {
      e.preventDefault();
      if (!tags.includes(tagDraft.trim())) setTags([...tags, tagDraft.trim()]);
      setTagDraft("");
    } else if (e.key === "Backspace" && !tagDraft && tags.length) setTags(tags.slice(0, -1));
  };
  const addFeature = () => {
    if (!featureDraft.trim()) return;
    setFeatures([...features, featureDraft.trim()]);
    setFeatureDraft("");
  };

  const canSubmit = type === "proposal" ? title.trim().length > 2 && description.trim().length > 20 : repoValid && !!repo;

  const submit = async () => {
    if (!canSubmit) {
      toast.error(type === "proposal" ? "Add a title and a description of at least 20 characters." : "Enter a valid GitHub repository URL.");
      return;
    }
    setRunning(true);
    try {
      const a = await analyzeProject({
        type,
        title: type === "github" && repo ? `${repo.owner}/${repo.name}` : title,
        description: type === "github" && repo ? repo.description : description,
        techStack: type === "github" && repo ? [repo.language, ...repo.topics.slice(0, 2)] : tags,
        features: type === "proposal" ? features : [],
        repoUrl: type === "github" ? repoUrl : undefined,
        sources,
        sensitivity: sens,
      });
      toast.success("Analysis complete");
      navigate({ to: "/analysis/$id", params: { id: a.id } });
    } catch {
      setRunning(false);
      toast.error("Analysis failed. Please try again.");
    }
  };

  return (
    <Page className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Analyze a project</h1>
      <p className="mt-2 text-muted-foreground">Tell us about your idea and we'll find what's already out there.</p>

      <Tabs value={type} onValueChange={(v) => setType(v as InputType)} className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="proposal"><FileText className="mr-2 h-4 w-4" />Proposal Text</TabsTrigger>
          <TabsTrigger value="github"><Github className="mr-2 h-4 w-4" />GitHub Repository</TabsTrigger>
        </TabsList>

        <TabsContent value="proposal" className="mt-6 space-y-6 rounded-xl border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <Label htmlFor="title">Project title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AI Study Planner" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={7} maxLength={MAX} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does it do, who is it for, and how does it work?" />
            <p className="text-right text-xs text-muted-foreground tabular-nums">{description.length} / {MAX}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tech stack</Label>
            <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1 font-mono font-normal">
                  {t}
                  <button onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              <input id="tags" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={addTag} placeholder={tags.length ? "" : "Type and press Enter"} className="min-w-24 flex-1 bg-transparent text-sm outline-none" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feature">Key features</Label>
            <div className="flex gap-2">
              <Input id="feature" value={featureDraft} onChange={(e) => setFeatureDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())} placeholder="e.g. Spaced repetition reminders" />
              <Button type="button" variant="outline" onClick={addFeature} aria-label="Add feature"><Plus className="h-4 w-4" /></Button>
            </div>
            <ul className="space-y-1.5">
              <AnimatePresence>
                {features.map((f, i) => (
                  <motion.li key={f + i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                    {f}
                    <button onClick={() => setFeatures(features.filter((_, j) => j !== i))} aria-label={`Remove ${f}`} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="github" className="mt-6 space-y-4 rounded-xl border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <Label htmlFor="repo">Repository URL</Label>
            <Input id="repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repo" className="font-mono" aria-invalid={!!repoUrl && !repoValid} aria-describedby="repo-hint" />
            <p id="repo-hint" className={repoUrl && !repoValid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {repoUrl && !repoValid ? "Use the format github.com/owner/repo" : "Public repositories only"}
            </p>
          </div>
          {repoLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Fetching repository…</div>}
          {repo && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-sm font-semibold"><Github className="h-4 w-4" />{repo.owner}/{repo.name}</span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="h-4 w-4" />{formatStars(repo.stars)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{repo.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge>{repo.language}</Badge>
                {repo.topics.map((t) => <Badge key={t} variant="secondary" className="font-mono font-normal">{t}</Badge>)}
              </div>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      <section className="mt-6 rounded-xl border bg-card p-6 shadow-soft" aria-labelledby="compare-h">
        <h2 id="compare-h" className="font-semibold">Compare against <span className="text-sm font-normal text-muted-foreground">(optional)</span></h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary/50 has-[:checked]:bg-accent/50">
              <Checkbox checked={sources.includes(s)} onCheckedChange={(c) => setSources(c ? [...sources, s] : sources.filter((x) => x !== s))} />
              {s}
            </label>
          ))}
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-sm"><Label>Similarity sensitivity</Label><span className="font-medium text-primary">{SENS[sens]}</span></div>
          <Slider className="mt-3" min={0} max={2} step={1} value={[sens]} onValueChange={([v]) => setSens(v ?? 1)} aria-label="Similarity sensitivity" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">{SENS.map((s) => <span key={s}>{s}</span>)}</div>
        </div>
      </section>

      <Button size="lg" onClick={submit} className="mt-6 w-full bg-gradient-primary text-primary-foreground shadow-glow">
        <Sparkles className="mr-2 h-4 w-4" /> Analyze
      </Button>

      <AnimatePresence>
        {running && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-background/95 backdrop-blur" role="dialog" aria-modal="true" aria-label="Analyzing">
            <div className="w-full max-w-sm px-6">
              <div className="mx-auto mb-8 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-7 w-7 animate-pulse" />
              </div>
              <LoadingSteps />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
