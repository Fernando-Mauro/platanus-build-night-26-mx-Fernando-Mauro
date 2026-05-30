"use client";
// Live roadmap hook (T031/T032). Fetches GET /api/roadmap and adapts the engine
// shape onto the visual node layout, preserving the prototype design while the
// numbers, statuses and recommendation come from the real Bayesian state.
import { useCallback, useEffect, useState } from "react";
import { fetchRoadmap, type RoadmapResponse, type RoadmapStatus } from "@/lib/api/vertice";
import type { TopicStatus } from "@/lib/data";

// Fixed visual layout for the 5 seeded competencies (single centered chain).
// Keyed by competency slug; the engine drives everything else.
const LAYOUT: Record<string, { left: number; top: number; icon: string }> = {
  arreglos:  { left: 385, top: 16,  icon: "IconBrackets" },
  hashing:   { left: 385, top: 148, icon: "IconHash" },
  recursion: { left: 385, top: 280, icon: "IconLayers" },
  arboles:   { left: 385, top: 412, icon: "IconArrows" },
  grafos:    { left: 385, top: 544, icon: "IconGit" },
};
const FALLBACK = { left: 385, top: 16, icon: "IconBrackets" };

function toVisualStatus(s: RoadmapStatus): TopicStatus {
  if (s === "LOCKED") return "locked";
  if (s === "MASTERED") return "mastered";
  return "learning"; // AVAILABLE | RECOMMENDED
}

export type LiveTopic = {
  id: string;
  competencyId: number;
  name: string;
  icon: string;
  mastery: number;
  status: TopicStatus;
  solved: string;
  left: number;
  top: number;
  blurb: string;
  recommended: boolean;
  recommendedProblemId: number | null;
};

export type LiveRoadmap = {
  topics: LiveTopic[];
  edges: [string, string][];
  recommendation: RoadmapResponse["recommendation"];
};

function adapt(data: RoadmapResponse): LiveRoadmap {
  const ordered = [...data.competencies].sort((a, b) => a.order - b.order);
  const topics: LiveTopic[] = ordered.map((c) => {
    const l = LAYOUT[c.slug] ?? FALLBACK;
    return {
      id: c.slug,
      competencyId: c.id,
      name: c.name,
      icon: l.icon,
      mastery: Math.round(c.pMastery),
      status: toVisualStatus(c.status),
      solved: `${c.solvedProblemIds.length} / ${c.totalProblems}`,
      left: l.left,
      top: l.top,
      blurb: c.blurb ?? "",
      recommended: c.recommended,
      recommendedProblemId: data.recommendation?.problemId ?? null,
    };
  });
  // Linear chain edges between consecutive competencies (by order).
  const edges: [string, string][] = [];
  for (let i = 1; i < ordered.length; i++) {
    edges.push([ordered[i - 1].slug, ordered[i].slug]);
  }
  return { topics, edges, recommendation: data.recommendation };
}

export function useRoadmap() {
  const [data, setData] = useState<LiveRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchRoadmap();
      setData(adapt(res));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el roadmap");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
