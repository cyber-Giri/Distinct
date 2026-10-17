import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCheck, Gauge, Layers, ScanSearch, Sparkles } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ErrorState, Page, PageSkeleton } from "@/components/distinct/shared";
import { formatDate, scoreLabel } from "@/lib/analysis-utils";
import { analysesQuery } from "./history";

export const Route = createFileRoute("/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(analysesQuery),
  ssr: false,
  pendingMs: 0,
  head: () => ({
    meta: [
      { title: "Dashboard — Distinct" },
      { name: "description", content: "Your originality stats, score trends and recent analyses." },
      { property: "og:title", content: "Dashboard — Distinct" },
      { property: "og:description", content: "Track how distinctive your projects are over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  pendingComponent: () => <PageSkeleton cards={3} />,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  notFoundComponent: () => <Page>Not found</Page>,
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(analysesQuery);
  const avg = data.length ? Math.round(data.reduce((s, a) => s + a.score, 0) / data.length) : 0;
  const scanned = data.reduce((s, a) => s + a.similar.length, 0);
  const adopted = (() => {
    if (typeof window === "undefined") return 0;
    return data.reduce((s, a) => {
      try { return s + (JSON.parse(localStorage.getItem(`distinct:adopted:${a.id}`) ?? "[]") as string[]).length; } catch { return s; }
    }, 0);
  })();
  const trend = [...data].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((a) => ({ date: formatDate(a.createdAt), score: a.score, title: a.title }));

  const stats = [
    { icon: Layers, label: "Total analyses", value: data.length },
    { icon: Gauge, label: "Avg. distinctiveness", value: avg },
    { icon: ScanSearch, label: "Similar projects found", value: scanned.toLocaleString() },
    { icon: CheckCheck, label: "Recommendations adopted", value: adopted },
  ];

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow"><Link to="/analyze"><Sparkles className="mr-1.5 h-4 w-4" />Start new analysis</Link></Button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-soft">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-soft lg:col-span-2">
          <h2 className="font-semibold">Distinctiveness over time</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number, _n, p) => [v, p.payload.title]} />
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--primary)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent analyses</h2>
            <Link to="/history" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <ul className="mt-4 space-y-1">
            {data.slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link to="/analysis/$id" params={{ id: a.id }} className="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted">
                  <div>
                    <p className="text-sm font-medium">{a.title}{a.isDemo ? " · Demo" : ""}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)} · {scoreLabel(a.score)}</p>
                  </div>
                  <span className="flex items-center gap-1 font-mono text-sm">{a.score}<ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Page>
  );
}
