import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, FileSearch, Gauge, Grid3x3, History, Lightbulb, MessageSquareText, Radar, ScanSearch, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreGauge, SimilarityBar, SourceIcon } from "@/components/distinct/shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Distinct — Is your idea really original?" },
      { name: "description", content: "Distinct scans GitHub and Devpost to find similar projects, explain the overlap and show where your idea can stand out." },
      { property: "og:title", content: "Distinct — Is your idea really original?" },
      { property: "og:description", content: "Find overlaps, discover white space and get an AI originality report for your project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: Send, title: "Submit your idea", text: "Paste a proposal or a GitHub repo link." },
  { icon: ScanSearch, title: "AI scans similar projects", text: "We compare against thousands of repos and hackathon entries." },
  { icon: FileSearch, title: "Get an originality report", text: "See overlaps, white space and how to stand out." },
];

const features = [
  { icon: Radar, title: "Similarity Detection", text: "Find the closest projects by meaning, not just keywords." },
  { icon: Grid3x3, title: "Feature Overlap Matrix", text: "See exactly which of your features already exist elsewhere." },
  { icon: MessageSquareText, title: "Plain-English Explanations", text: "Understand why two projects are similar, in simple terms." },
  { icon: Lightbulb, title: "Innovation Suggestions", text: "Discover unexplored angles no one has built yet." },
  { icon: Gauge, title: "Distinctiveness Score", text: "One clear 0–100 score and how to raise it." },
  { icon: History, title: "Analysis History", text: "Track how your idea becomes more original over time." },
];

function Landing() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> AI originality reports
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
              Is your idea <span className="text-gradient">really original?</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Distinct finds projects like yours, explains exactly where they overlap, and shows you the white space where your idea can stand out.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow">
                <Link to="/analyze">
                  Analyze your project <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/analysis/$id" params={{ id: "ai-study-planner" }}>See a sample report</Link>
              </Button>
            </div>
          </motion.div>
          <SampleCard />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="rounded-xl border bg-card p-6 shadow-soft">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <s.icon className="mt-4 h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">Everything you need to stand out</h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group bg-card p-6 transition-colors hover:bg-accent/40">
              <f.icon className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="rounded-2xl bg-gradient-primary p-10 text-center text-primary-foreground shadow-glow">
          <BarChart3 className="mx-auto h-8 w-8" />
          <h2 className="mt-4 text-2xl font-semibold">Know your competition before you build</h2>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/analyze">Start a free analysis</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function SampleCard() {
  const rows = [
    { name: "studyflow-ai", source: "github" as const, v: 84 },
    { name: "PlanMyExam", source: "devpost" as const, v: 76 },
    { name: "anki-scheduler-plus", source: "github" as const, v: 68 },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 20, rotate: 1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="rounded-2xl border bg-card p-6 shadow-glow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Sample report</p>
          <p className="font-semibold">AI Study Planner</p>
        </div>
        <ScoreGauge score={62} size={110} />
      </div>
      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="mb-1.5 flex items-center gap-2 font-mono text-xs">
              <SourceIcon source={r.source} className="h-3.5 w-3.5 text-muted-foreground" /> {r.name}
            </div>
            <SimilarityBar value={r.v} />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
        <Lightbulb className="mr-1.5 inline h-4 w-4" /> White space: burnout-aware planning
      </div>
    </motion.div>
  );
}
