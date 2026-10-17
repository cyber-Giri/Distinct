import type { Analysis } from "./types";

export function scoreLabel(score: number) {
  if (score < 40) return "Low";
  if (score < 60) return "Moderate";
  if (score < 80) return "High";
  return "Highly Unique";
}

export function saturation(a: Analysis) {
  const n = a.similar.length || 1;
  return a.features.map((feature, i) => {
    const total = a.similar.reduce((s, p) => {
      const c = p.coverage[i];
      return s + (c === "full" ? 1 : c === "partial" ? 0.5 : 0);
    }, 0);
    return { feature, pct: Math.round((total / n) * 100) };
  });
}

export function overlappingCount(a: Analysis) {
  return saturation(a).filter((s) => s.pct > 0).length;
}

export function mostSaturated(a: Analysis) {
  const s = saturation(a).sort((x, y) => y.pct - x.pct);
  return s[0]?.feature ?? "—";
}

export function projectedScore(a: Analysis, adopted: Set<string>) {
  const gain = a.recommendations.filter((r) => adopted.has(r.id)).reduce((s, r) => s + r.scoreGain, 0);
  return Math.min(99, a.score + gain);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatStars(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/** Deterministic landscape positions: closer to the centre = more similar. */
export function landscape(a: Analysis) {
  const clusters = [...new Set(a.similar.map((p) => p.cluster))];
  const points = a.similar.map((p, i) => {
    const ci = clusters.indexOf(p.cluster);
    const angle = (ci / clusters.length) * Math.PI * 2 + (i % 3) * 0.35;
    const r = (100 - p.similarity) * 0.9 + 6;
    return {
      id: p.id,
      name: p.name,
      similarity: p.similarity,
      cluster: p.cluster,
      x: Math.round(50 + Math.cos(angle) * r * 0.5),
      y: Math.round(50 + Math.sin(angle) * r * 0.5),
    };
  });
  const labels = clusters.map((c) => {
    const ps = points.filter((p) => p.cluster === c);
    return {
      cluster: c,
      x: ps.reduce((s, p) => s + p.x, 0) / ps.length,
      y: ps.reduce((s, p) => s + p.y, 0) / ps.length,
    };
  });
  return { clusters, points, labels };
}
