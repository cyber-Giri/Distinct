import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Columns2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Page, PageSkeleton, SimilarityBar, SourceIcon } from "@/components/distinct/shared";
import { compareProjects } from "@/services/api";
import { cn } from "@/lib/utils";

const compareQuery = (a: string, b: string) => queryOptions({ queryKey: ["compare", a, b], queryFn: () => compareProjects(a, b) });

export const Route = createFileRoute("/compare")({
  validateSearch: (s: Record<string, unknown>) => ({ a: String(s["a"] ?? ""), b: String(s["b"] ?? "") }),
  loaderDeps: ({ search: { a, b } }) => ({ a, b }),
  loader: ({ context, deps }) => (deps.a && deps.b ? context.queryClient.ensureQueryData(compareQuery(deps.a, deps.b)) : null),
  ssr: false,
  pendingMs: 0,
  head: () => ({
    meta: [
      { title: "Compare projects — Distinct" },
      { name: "description", content: "Side-by-side comparison of your project and a similar one." },
      { property: "og:title", content: "Compare projects — Distinct" },
      { property: "og:description", content: "See what matches and what makes your project different." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: () => <PageSkeleton cards={2} />,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  notFoundComponent: () => <Page>Not found</Page>,
  component: ComparePage,
});

function ComparePage() {
  const { a, b } = Route.useSearch();
  if (!a || !b)
    return (
      <Page>
        <EmptyState icon={Columns2} title="Nothing to compare yet" description="Open an analysis and choose “Compare side-by-side” on a similar project." action={<Button asChild><Link to="/history">Go to history</Link></Button>} />
      </Page>
    );
  return <Comparison a={a} b={b} />;
}

function Comparison({ a, b }: { a: string; b: string }) {
  const { data } = useSuspenseQuery(compareQuery(a, b));
  const { analysis, project, rows, summary } = data;
  return (
    <Page>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
        <Link to="/analysis/$id" params={{ id: analysis.id }}><ArrowLeft className="mr-1 h-4 w-4" />Back to results</Link>
      </Button>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border-2 border-primary/40 bg-card p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Your project</p>
          <h1 className="mt-1 text-xl font-semibold">{analysis.title}</h1>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><SourceIcon source={project.source} className="h-3.5 w-3.5" />Similar project</p>
          <h2 className="mt-1 font-mono text-xl font-semibold">{project.name}</h2>
          <SimilarityBar value={project.similarity} className="mt-3" />
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-success/30 ring-1 ring-success" />Matching</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-warning/30 ring-1 ring-warning" />Different</span>
      </div>

      <div className="mt-4 divide-y rounded-xl border bg-card shadow-soft">
        {rows.map((r) => (
          <div key={r.label} className="p-5">
            <h3 className="mb-3 text-sm font-semibold">{r.label}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[r.mine, r.theirs].map((items, side) => (
                <div key={side} className="flex flex-wrap gap-2">
                  {items.map((it) => (
                    <span key={it.text} className={cn("rounded-md px-2.5 py-1.5 text-sm", it.match ? "bg-success/15 ring-1 ring-success/40" : "bg-warning/15 ring-1 ring-warning/40", items.length === 1 && "w-full")}>
                      {it.text}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-xl border bg-gradient-to-br from-accent to-card p-6 shadow-soft">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" />What makes yours different</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {summary.map((s) => <li key={s} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{s}</li>)}
        </ul>
      </section>
    </Page>
  );
}
