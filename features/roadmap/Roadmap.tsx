"use client";

import { useEffect } from "react";
import { ICONS, IconLock, IconSparkles, IconTarget } from "@/lib/icons";
import type { TopicStatus } from "@/lib/data";
import { useRoadmap, type LiveTopic } from "./useRoadmap";

// Graph canvas in SVG user units; scales responsively via viewBox.
const CANVAS_W = 800;
const CANVAS_H = 520;
const NODE_R = 46; // node radius

const STATUS: Record<
  TopicStatus,
  { stroke: string; fill: string; bar: string; text: string; label: string; glow: string }
> = {
  mastered: { stroke: "#34d399", fill: "rgba(16,185,129,0.12)", bar: "#34d399", text: "text-emerald-300", label: "Dominado", glow: "#10b981" },
  learning: { stroke: "#fbbf24", fill: "rgba(245,158,11,0.12)", bar: "#fbbf24", text: "text-amber-300", label: "Aprendiendo", glow: "#f59e0b" },
  locked:   { stroke: "#3f3f46", fill: "rgba(39,39,42,0.6)", bar: "#52525b", text: "text-zinc-500", label: "Bloqueado", glow: "#27272a" },
};

function GraphNode({ t, onOpen }: { t: LiveTopic; onOpen: (t: LiveTopic) => void }) {
  const Icon = ICONS[t.icon] ?? ICONS.IconBrackets;
  const s = STATUS[t.status];
  const locked = t.status === "locked";
  const rec = t.recommended;
  const cx = t.left;
  const cy = t.top;
  // Mastery ring (circular progress around the node).
  const ringR = NODE_R + 6;
  const circ = 2 * Math.PI * ringR;
  const dash = (t.mastery / 100) * circ;

  return (
    <g
      transform={`translate(${cx} ${cy})`}
      className={locked ? "cursor-not-allowed" : "cursor-pointer"}
      onClick={() => !locked && onOpen(t)}
      style={{ transition: "all .3s" }}
    >
      {/* recommended halo */}
      {rec && <circle r={ringR + 10} fill="none" stroke="#38bdf8" strokeWidth={1.5} opacity={0.4} />}

      {/* progress ring background + value */}
      <circle r={ringR} fill="none" stroke="#27272a" strokeWidth={5} />
      <circle
        r={ringR}
        fill="none"
        stroke={s.bar}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90)"
        style={{ transition: "stroke-dasharray .7s ease-out" }}
      />

      {/* node body */}
      <circle r={NODE_R} fill="#18181b" stroke={s.stroke} strokeWidth={2} />
      <circle r={NODE_R} fill={s.fill} />

      {/* icon */}
      <g transform="translate(-11 -22)" stroke={s.stroke}>
        {locked ? <IconLock size={22} /> : <Icon size={22} />}
      </g>

      {/* mastery % */}
      <text textAnchor="middle" y={6} className="fill-zinc-100 font-mono font-semibold" fontSize={17}>
        {t.mastery}%
      </text>
      {/* name */}
      <text textAnchor="middle" y={24} className="fill-zinc-400" fontSize={10}>
        {t.name.length > 14 ? t.name.slice(0, 13) + "…" : t.name}
      </text>

      {/* recommended badge */}
      {rec && (
        <g transform={`translate(0 ${-ringR - 16})`}>
          <rect x={-34} y={-9} width={68} height={18} rx={9} fill="#38bdf8" />
          <text textAnchor="middle" y={4} className="fill-sky-950 font-semibold" fontSize={9}>
            ◎ REFORZAR
          </text>
        </g>
      )}
    </g>
  );
}

function Edge({ from, to, dim }: { from: LiveTopic; to: LiveTopic; dim: boolean }) {
  // Cubic curve between two node centers for an organic graph look.
  const x1 = from.left, y1 = from.top, x2 = to.left, y2 = to.top;
  const mx = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  return (
    <path
      d={d}
      fill="none"
      stroke={dim ? "#3f3f46" : "#0ea5e9"}
      strokeWidth={dim ? 1.5 : 2.5}
      strokeDasharray={dim ? "5 6" : "0"}
      opacity={dim ? 0.5 : 0.8}
      markerEnd="url(#arrow)"
    />
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

  useEffect(() => {
    if (refreshSignal !== undefined) refresh();
  }, [refreshSignal, refresh]);

  const byId = new Map((data?.topics ?? []).map((t) => [t.id, t]));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-6">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-sky-400">
          <IconSparkles size={14} /> Red bayesiana de conocimiento
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Tu Mapa</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cada nodo es una competencia; las aristas son prerequisitos. El dominio se actualiza con cada envío.
        </p>

        {data?.recommendation && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-4 py-2.5 text-sm">
            <IconTarget size={16} className="mt-0.5 shrink-0 text-sky-400" />
            <span className="text-zinc-200">
              {data.recommendation.reason === "PREREQUISITE_GAP" ? (
                <>Refuerza <span className="font-semibold text-sky-300">{data.recommendation.competencyName}</span> — es tu prerequisito más débil.</>
              ) : (
                <>Siguiente paso: <span className="font-semibold text-sky-300">{data.recommendation.competencyName}</span>.</>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 p-4">
        {loading && (
          <div className="flex h-full items-center justify-center gap-3 text-zinc-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-400" />
            Cargando tu mapa…
          </div>
        )}
        {!loading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
            <p className="text-sm">No se pudo cargar el mapa.</p>
            <button onClick={refresh} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
              Reintentar
            </button>
          </div>
        )}
        {!loading && !error && data && (
          <div className="mx-auto h-full max-w-4xl">
            <svg
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              className="h-full w-full"
              style={{ maxHeight: "100%" }}
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#0ea5e9" opacity={0.7} />
                </marker>
                <radialGradient id="bg-glow" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </radialGradient>
              </defs>
              <rect width={CANVAS_W} height={CANVAS_H} fill="url(#bg-glow)" />

              {/* edges first (under nodes) */}
              {data.edges.map(([a, b]) => {
                const from = byId.get(a);
                const to = byId.get(b);
                if (!from || !to) return null;
                const dim = to.status === "locked";
                return <Edge key={`${a}-${b}`} from={from} to={to} dim={dim} />;
              })}

              {/* nodes */}
              {data.topics.map((t) => (
                <GraphNode key={t.id} t={t} onOpen={onOpen} />
              ))}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
