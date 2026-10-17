import { Link } from "@tanstack/react-router";
import { ChevronDown, Columns2, Star } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatStars } from "@/lib/analysis-utils";
import type { SimilarProject } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SimilarityBar, SourceIcon } from "./shared";

export function ProjectCard({ project, analysisId }: { project: SimilarProject; analysisId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SourceIcon source={project.source} className="text-muted-foreground" />
            <h3 className="truncate font-mono text-sm font-semibold">{project.name}</h3>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{project.description}</p>
        </div>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Star className="h-4 w-4" aria-hidden /> {formatStars(project.stars)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {project.tech.map((t) => (
          <Badge key={t} variant="secondary" className="font-mono text-xs font-normal">
            {t}
          </Badge>
        ))}
      </div>
      <SimilarityBar value={project.similarity} className="mt-4" />
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-2" aria-expanded={open}>
              Why it's similar
              <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", open && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <Button asChild variant="outline" size="sm">
            <Link to="/compare" search={{ a: analysisId, b: project.id }}>
              <Columns2 className="mr-1.5 h-4 w-4" /> Compare side-by-side
            </Link>
          </Button>
        </div>
        <CollapsibleContent>
          <ul className="mt-2 space-y-1.5 rounded-lg bg-muted/60 p-4 text-sm">
            {project.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </article>
  );
}
