"use client";

import { useEffect } from "react";
import { ICONS, IconArrowRight, IconLock, IconSparkles, IconTarget } from "@/lib/icons";
import type { TopicStatus } from "@/lib/data";
import { useRoadmap, type LiveTopic } from "./useRoadmap";

const CW = 190, CH = 92, CANVAS_W = 960, CANVAS_H = 660;

const STATUS_STYLES: Record<TopicStatus, {
  ring: string; chip: string; bar: string; dot: string; label: string; labelCls: string;
}> = {
  mastered: { ring: "border-emerald-500/30", chip: "bg-emerald-500/10 text-emerald-300", bar: "bg-emerald-400", dot: "bg-emerald-400", label: "Dominado",    labelCls: "text-emerald-300/90" },
  learning: { ring: "border-amber-500/25",   chip: "bg-amber-500/10 text-amber-300",     bar: "bg-amber-400",   dot: "bg-amber-400",   label: "Aprendiendo", labelCls: "text-amber-300/90" },
  locked:   { ring: "border-zinc-800",        chip: "bg-zinc-800/60 text-zinc-500",       bar: "bg-zinc-700",    dot: "bg-zinc-600",    label: "Bloqueado",  labelCls: "text-zinc-500" },
};

function TopicNode({ t, onOpen }: { t: LiveTopic; onOpen: (t: LiveTopic) => void }) {
  const TopicIcon = ICONS[t.icon] ?? ICONS.IconBrackets;
  const s = STATUS_STYLES[t.status];
  const locked = t.status === "locked";
  const rec = t.recommended;
  return (
    <button
      onClick={() => !locked && onOpen(t)}
      disabled={locked}
      style={{ left: t.left, top: t.top, width: CW }}
      className={[
        "group absolute rounded-xl border bg-zinc-900/80 p-3.5 text-left backdrop-blur-sm transition-all duration-200",
        "shadow-lg shadow-black/30",
        locked ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:-translate-y-1 hover:bg-zinc-900",
        rec ? "border-sky-500/60 shadow-sky-500/10 ring-2 ring-sky-500/40" : s.ring,
      ].join(" ")}
    >
      {rec && (
        <span className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-950">
          <IconTarget size={11} strokeWidth={2.5} /> Punto débil
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.chip}`}>
          {locked ? <IconLock size={15} /> : <TopicIcon size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-100">{t.name}</div>
          <div className="truncate text-[11px] text-zinc-500">{t.blurb}</div>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <span className={`text-[10px] font-medium uppercase tracking-wide ${s.labelCls}`}>{s.label}</span>
        <span className="font-mono text-base font-semibold leading-none text-zinc-100 tabular-nums">
          {t.mastery}%
        </span>
      </div>
      {/* Animated bar so the aggressive learning rate is visible (T033). */}
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${s.bar} transition-all duration-700 ease-out`}
          style={{ width: `${t.mastery}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{t.solved}</span>
        {!locked && (
          <span className="flex items-center gap-0.5 text-zinc-400 transition-colors group-hover:text-sky-300">
            {rec ? "Reforzar" : "Practicar"} <IconArrowRight size={11} />
          </span>
        )}
      </div>
    </button>
  );
}

function EdgeLines({ topics, edges }: { topics: LiveTopic[]; edges: [string, string][] }) {
  const byId = new Map(topics.map((t) => [t.id, t]));
  return (
    <svg className="pointer-events-none absolute inset-0" width={CANVAS_W} height={CANVAS_H}>
      {edges.map(([from, to]) => {
        const a = byId.get(from);
        const b = byId.get(to);
        if (!a || !b) return null;
        const x1 = a.left + CW / 2, y1 = a.top + CH / 2;
        const x2 = b.left + CW / 2, y2 = b.top + CH / 2;
        return (
          <line
            key={`${from}-${to}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-zinc-800"
          />
        );
      })}
    </svg>
  );
}

export function Roadmap({
  onOpen,
  refreshSignal,
}: {
  onOpen: (t?: unknown) => void;
  refreshSignal?: number;
}) {
  const { data, loading, error, refresh } = useRoadmap();

  // Re-fetch whenever the parent bumps the signal (e.g. after a submission, T032).
  useEffect(() => {
    if (refreshSignal !== undefined) refresh();
  }, [refreshSignal, refresh]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Tu Roadmap</h1>
          <p className="text-sm text-zinc-500">Progreso personalizado según tu desempeño</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <IconSparkles size={14} className="text-sky-400" />
          Adaptado por IA
        </div>
      </div>

      {data?.recommendation && (
        <div className="border-b border-zinc-800 bg-sky-500/[0.04] px-6 py-2.5 text-sm text-sky-200">
          <IconTarget size={13} className="mr-1 inline" />
          {data.recommendation.reason === "PREREQUISITE_GAP"
            ? <>Refuerza <span className="font-medium">{data.recommendation.competencyName}</span> — es tu prerequisito más débil.</>
            : <>Siguiente paso: <span className="font-medium">{data.recommendation.competencyName}</span>.</>}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-6">
        {loading && (
          <div className="flex h-full items-center justify-center gap-3 text-zinc-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-400" />
            Cargando tu roadmap…
          </div>
        )}
        {!loading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
            <p className="text-sm">No se pudo cargar el roadmap.</p>
            <button onClick={refresh} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
              Reintentar
            </button>
          </div>
        )}
        {!loading && !error && data && (
          <div className="relative mx-auto" style={{ width: CANVAS_W, height: CANVAS_H }}>
            <EdgeLines topics={data.topics} edges={data.edges} />
            {data.topics.map((t) => (
              <TopicNode key={t.id} t={t} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
