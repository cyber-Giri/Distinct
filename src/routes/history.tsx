import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileText, Github, Inbox, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, Page, PageSkeleton } from "@/components/distinct/shared";
import { deleteAnalysis, listAnalyses } from "@/services/api";
import { formatDate, scoreLabel } from "@/lib/analysis-utils";
import type { Analysis } from "@/lib/types";

export const analysesQuery = queryOptions({ queryKey: ["analyses"], queryFn: listAnalyses });

export const Route = createFileRoute("/history")({
  loader: ({ context }) => context.queryClient.ensureQueryData(analysesQuery),
  ssr: false,
  pendingMs: 0,
  head: () => ({
    meta: [
      { title: "Analysis history — Distinct" },
      { name: "description", content: "Browse, search and manage your past originality analyses." },
      { property: "og:title", content: "Analysis history — Distinct" },
      { property: "og:description", content: "All your past originality reports in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: () => <PageSkeleton />,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  notFoundComponent: () => <Page>Not found</Page>,
  component: HistoryPage,
});

function HistoryPage() {
  const { data } = useSuspenseQuery(analysesQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [target, setTarget] = useState<Analysis | null>(null);

  const del = useMutation({
    mutationFn: deleteAnalysis,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analyses"] });
      toast.success("Analysis deleted");
    },
    onError: () => toast.error("Couldn't delete analysis"),
  });

  const rows = useMemo(() => {
    const f = data.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));
    const s = { newest: (a: Analysis, b: Analysis) => b.createdAt.localeCompare(a.createdAt), oldest: (a: Analysis, b: Analysis) => a.createdAt.localeCompare(b.createdAt), score: (a: Analysis, b: Analysis) => b.score - a.score, title: (a: Analysis, b: Analysis) => a.title.localeCompare(b.title) }[sort]!;
    return [...f].sort(s);
  }, [data, q, sort]);

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-muted-foreground">{data.length} analyses</p>
        </div>
        <Button asChild className="bg-gradient-primary text-primary-foreground"><Link to="/analyze"><Plus className="mr-1 h-4 w-4" />New analysis</Link></Button>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search analyses…" className="pl-9" aria-label="Search analyses" />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-48" aria-label="Sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="score">Highest score</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState icon={Inbox} title={q ? "No matches" : "No analyses yet"} description={q ? "Try a different search term." : "Run your first analysis to see it here."} action={!q && <Button asChild><Link to="/analyze">Analyze a project</Link></Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a) => (
              <div
                key={a.id}
                role="link"
                tabIndex={0}
                onClick={() => navigate({ to: "/analysis/$id", params: { id: a.id } })}
                onKeyDown={(e) => e.key === "Enter" && navigate({ to: "/analysis/$id", params: { id: a.id } })}
                className="group cursor-pointer rounded-xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="gap-1 font-normal">{a.type === "github" ? <Github className="h-3 w-3" /> : <FileText className="h-3 w-3" />}{a.type === "github" ? "Repository" : "Proposal"}</Badge>
                    {a.isDemo ? <Badge variant="outline">Demo data</Badge> : null}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 hover:opacity-100" aria-label={`Delete ${a.title}`} onClick={(e) => { e.stopPropagation(); setTarget(a); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <h2 className="mt-3 font-semibold group-hover:text-primary">{a.title}</h2>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-semibold tabular-nums">{a.score}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{scoreLabel(a.score)}</span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="mb-1 flex items-center justify-end gap-1.5 capitalize"><span className="h-1.5 w-1.5 rounded-full bg-success" />{a.status}</div>
                    {formatDate(a.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{target?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes the analysis and its report. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => target && del.mutate(target.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
