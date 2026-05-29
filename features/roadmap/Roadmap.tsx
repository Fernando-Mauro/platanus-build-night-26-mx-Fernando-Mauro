"use client";

import { EDGES, TOPICS, type Topic, type TopicStatus } from "@/lib/data";
import { ICONS, IconArrowRight, IconLock, IconPlay, IconSparkles, IconTarget } from "@/lib/icons";

const CW = 190, CH = 92, CANVAS_W = 960, CANVAS_H = 660;

const STATUS_STYLES: Record<TopicStatus, {
  ring: string; chip: string; bar: string; dot: string; label: string; labelCls: string;
}> = {
  mastered: { ring: "border-emerald-500/30", chip: "bg-emerald-500/10 text-emerald-300", bar: "bg-emerald-400", dot: "bg-emerald-400", label: "Dominado",    labelCls: "text-emerald-300/90" },
  learning: { ring: "border-amber-500/25",   chip: "bg-amber-500/10 text-amber-300",     bar: "bg-amber-400",   dot: "bg-amber-400",   label: "Aprendiendo", labelCls: "text-amber-300/90" },
  locked:   { ring: "border-zinc-800",        chip: "bg-zinc-800/60 text-zinc-500",       bar: "bg-zinc-700",    dot: "bg-zinc-600",    label: "Bloqueado",  labelCls: "text-zinc-500" },
};

function TopicNode({ t, onOpen }: { t: Topic; onOpen: (t: Topic) => void }) {
  const TopicIcon = ICONS[t.icon];
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
          {t.mastery}<span className="text-xs text-zinc-500">%</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${s.bar} transition-all`} style={{ width: `${t.mastery}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Dominio estimado</span>
        <span className="font-mono">{t.solved}</span>
      </div>
    </button>
  );
}

function KnowledgeTree({ onOpen }: { onOpen: (t: Topic) => void }) {
  const byId = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<string, Topic>;
  const center = (t: Topic) => ({ x: t.left + CW / 2, y: t.top + CH / 2 });
  return (
    <div className="relative mx-auto" style={{ width: CANVAS_W, height: CANVAS_H }}>
      <svg className="pointer-events-none absolute inset-0" width={CANVAS_W} height={CANVAS_H}>
        {EDGES.map(([a, b], i) => {
          const s = center(byId[a]), e = center(byId[b]);
          const my = (s.y + e.y) / 2;
          const d = `M ${s.x} ${s.y} C ${s.x} ${my}, ${e.x} ${my}, ${e.x} ${e.y}`;
          const toLocked = byId[b].status === "locked";
          const active = byId[a].recommended || byId[b].recommended;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={active ? "#38bdf8" : toLocked ? "#3f3f46" : "#52525b"}
              strokeWidth={active ? 2 : 1.5}
              strokeDasharray={toLocked ? "5 6" : "0"}
              opacity={toLocked ? 0.6 : 0.85}
            />
          );
        })}
      </svg>
      {TOPICS.map((t) => (
        <TopicNode key={t.id} t={t} onOpen={onOpen} />
      ))}
    </div>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["bg-emerald-400", "Dominado"],
    ["bg-amber-400", "Aprendiendo"],
    ["bg-zinc-600", "Bloqueado"],
  ];
  return (
    <div className="absolute right-5 top-5 z-10 flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-[11px] backdrop-blur">
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1.5 text-zinc-400">
          <span className={`h-2 w-2 rounded-full ${c}`} />
          {l}
        </span>
      ))}
    </div>
  );
}

function ContinueCTA({ onGo }: { onGo: () => void }) {
  return (
    <button
      onClick={onGo}
      className="group relative flex w-full max-w-sm items-center gap-4 overflow-hidden rounded-xl border border-sky-500/40 bg-gradient-to-br from-sky-500/15 to-sky-500/[0.03] p-4 text-left transition-all hover:border-sky-400/60 hover:from-sky-500/20"
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sky-500/20 blur-2xl transition-opacity group-hover:opacity-80" />
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-sky-950 shadow-lg shadow-sky-500/30">
        <IconPlay size={18} />
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-400">Continuar aprendizaje</div>
        <div className="mt-0.5 truncate text-sm font-semibold text-zinc-100">Two Sum · reforzando Hashing</div>
        <div className="truncate text-xs text-zinc-400">Siguiente problema sugerido por tu modelo</div>
      </div>
      <IconArrowRight size={18} className="relative shrink-0 text-sky-400 transition-transform group-hover:translate-x-1" />
    </button>
  );
}

export function Roadmap({ onOpen, onGo }: { onOpen: (t?: Topic) => void; onGo: () => void }) {
  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-sky-400">
            <IconSparkles size={14} /> Motor adaptativo bayesiano
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">Mapa de Conocimiento</h1>
          <p className="mt-1.5 max-w-md text-sm text-zinc-500">
            Cada nodo refleja tu <span className="text-zinc-300">dominio estimado</span>, inferido de tus envíos mediante una red bayesiana que propaga evidencia entre temas relacionados.
          </p>
        </div>
        <ContinueCTA onGo={onGo} />
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5 text-sm">
        <IconTarget size={16} className="shrink-0 text-amber-400" />
        <span className="text-zinc-300">
          Tu modelo detecta una debilidad en <b className="font-semibold text-amber-300">Grafos</b> — probabilidad de dominio del <b className="font-semibold text-amber-300">28 %</b>. Reforzarlo desbloqueará <span className="text-zinc-400">Programación Dinámica</span>.
        </span>
      </div>

      <div
        className="relative overflow-auto rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.045) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      >
        <Legend />
        <KnowledgeTree onOpen={onOpen} />
      </div>
    </div>
  );
}
