import { motion } from "framer-motion";
import { AlertTriangle, Check, Github, Loader2, Trophy, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { scoreLabel } from "@/lib/analysis-utils";
import type { Source } from "@/lib/types";

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10", className)}
    >
      {children}
    </motion.main>
  );
}

export function ScoreGauge({ score, size = 140 }: { score: number; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Distinctiveness score ${score} out of 100, ${scoreLabel(score)}`}>
      <svg width={size} height={size} className="rotate-[135deg]">
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--primary-glow)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} strokeDasharray={`${arc} ${c}`} strokeLinecap="round" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#gauge)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: arc - (arc * score) / 100 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums">{score}</span>
        <span className="text-xs text-muted-foreground">{scoreLabel(score)}</span>
      </div>
    </div>
  );
}

export function SimilarityBar({ value, className }: { value: number; className?: string }) {
  const tone = value >= 75 ? "bg-destructive" : value >= 55 ? "bg-warning" : "bg-success";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Similarity">
        <motion.div className={cn("h-full rounded-full", tone)} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
      <span className="w-10 text-right font-mono text-sm font-medium tabular-nums">{value}%</span>
    </div>
  );
}

export function SourceIcon({ source, className }: { source: Source; className?: string }) {
  return source === "github" ? (
    <Github className={cn("h-4 w-4", className)} aria-label="GitHub" />
  ) : (
    <Trophy className={cn("h-4 w-4", className)} aria-label="Devpost" />
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const router = useRouter();
  return (
    <Page>
      <EmptyState
        icon={AlertTriangle}
        title="Something went wrong"
        description={error instanceof Error ? error.message : "An unexpected error occurred."}
        action={<Button onClick={() => router.invalidate()}>Try again</Button>}
      />
    </Page>
  );
}

export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-lg" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export const ANALYSIS_STEPS = ["Understanding your idea", "Searching similar projects", "Comparing features", "Generating insights"];

export function LoadingSteps({ steps = ANALYSIS_STEPS, interval = 900 }: { steps?: string[]; interval?: number }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, steps.length - 1)), interval);
    return () => clearInterval(t);
  }, [steps.length, interval]);
  return (
    <ol className="space-y-3" aria-live="polite">
      {steps.map((s, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <motion.li
            key={s}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: i <= active ? 1 : 0.4, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            <span className={cn("grid h-7 w-7 place-items-center rounded-full border", done && "border-transparent bg-success text-success-foreground", current && "border-primary text-primary")}>
              {done ? <Check className="h-4 w-4" /> : current ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs">{i + 1}</span>}
            </span>
            <span className={cn("text-sm", current && "font-medium")}>{s}</span>
          </motion.li>
        );
      })}
    </ol>
  );
}
