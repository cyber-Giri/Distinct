import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Analysis, Coverage } from "@/lib/types";
import { cn } from "@/lib/utils";

const label: Record<Coverage, string> = { full: "Full", partial: "Partial", none: "None" };
const dot: Record<Coverage, string> = {
  full: "bg-destructive",
  partial: "bg-warning",
  none: "border-2 border-muted-foreground/30 bg-transparent",
};

export function FeatureMatrix({ analysis }: { analysis: Analysis }) {
  const top = [...analysis.similar].sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-soft">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th scope="col" className="px-4 py-3 text-left font-medium">Your features</th>
              {top.map((p) => (
                <th key={p.id} scope="col" className="px-3 py-3 text-center font-mono text-xs font-medium">
                  {p.name}
                  <div className="font-sans text-muted-foreground">{p.similarity}%</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {analysis.features.map((f, i) => (
              <tr key={f} className="border-b last:border-0 hover:bg-muted/30">
                <th scope="row" className="px-4 py-3 text-left font-normal">{f}</th>
                {top.map((p) => {
                  const c = p.coverage[i] ?? "none";
                  return (
                    <td key={p.id} className="px-3 py-3 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-grid h-6 w-6 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`${p.name}: ${label[c]} overlap on ${f}`}>
                            <span className={cn("h-3 w-3 rounded-full", dot[c])} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="font-mono">{p.name}</span> — {label[c]} overlap
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        {(Object.keys(label) as Coverage[]).map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", dot[c])} /> {label[c]}
          </span>
        ))}
      </div>
    </TooltipProvider>
  );
}
