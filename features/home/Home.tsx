"use client";

import { ProblemList } from "@/components/ProblemList";
import { ACTIVITY, HEATMAP, PROBLEMS, TOPICS, USER, type ActivityKind } from "@/lib/data";
import {
  ICONS,
  IconArrowRight,
  IconAward,
  IconCircleCheck,
  IconFlame,
  IconList,
  IconNetwork,
  IconPlay,
  IconRoute,
  IconTrendingUp,
  type IconComponent,
} from "@/lib/icons";

function StatCard({
  icon: IconC,
  label,
  value,
  accent,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
        <IconC size={17} />
      </span>
      <div>
        <div className="font-mono text-lg font-semibold leading-none text-zinc-100 tabular-nums">{value}</div>
        <div className="mt-1 text-[11px] text-zinc-500">{label}</div>
      </div>
    </div>
  );
}

function ContinueBanner({ onGo }: { onGo: () => void }) {
  return (
    <button
      onClick={onGo}
      className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-sky-500/40 bg-gradient-to-br from-sky-500/15 to-sky-500/[0.03] p-4 text-left transition-all hover:border-sky-400/60 hover:from-sky-500/20"
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl transition-opacity group-hover:opacity-80" />
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-sky-950 shadow-lg shadow-sky-500/30">
        <IconPlay size={20} />
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-400">Continuar aprendizaje</div>
        <div className="mt-0.5 truncate text-[15px] font-semibold text-zinc-100">Two Sum · reforzando Hashing</div>
        <div className="truncate text-xs text-zinc-400">Siguiente problema sugerido por tu modelo bayesiano</div>
      </div>
      <IconArrowRight size={18} className="relative shrink-0 text-sky-400 transition-transform group-hover:translate-x-1" />
    </button>
  );
}

function SkillBars() {
  const items = TOPICS.filter((t) => t.status !== "locked").slice(0, 5);
  const barCls: Record<string, string> = { mastered: "bg-emerald-400", learning: "bg-amber-400" };
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Dominio por tema</h3>
        <IconNetwork size={15} className="text-zinc-600" />
      </div>
      <div className="mt-3.5 space-y-3">
        {items.map((t) => (
          <div key={t.id}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-zinc-400">{t.name}</span>
              <span className="font-mono text-zinc-300 tabular-nums">{t.mastery}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full rounded-full ${barCls[t.status] || "bg-zinc-600"}`} style={{ width: `${t.mastery}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ACT_META: Record<ActivityKind, { icon: string; cls: string }> = {
  accepted: { icon: "IconCircleCheck", cls: "text-emerald-400" },
  wrong:    { icon: "IconX",           cls: "text-rose-400" },
  level:    { icon: "IconTrophy",      cls: "text-sky-400" },
};

function RecentActivity() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">Actividad reciente</h3>
      <div className="mt-3 space-y-3">
        {ACTIVITY.map((a) => {
          const m = ACT_META[a.kind];
          const I = ICONS[m.icon];
          return (
            <div key={a.id} className="flex items-center gap-3">
              <span className={`mt-0.5 shrink-0 ${m.cls}`}><I size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-zinc-200">{a.title}</div>
                <div className="truncate text-[11px] text-zinc-500">{a.meta}</div>
              </div>
              <span className="shrink-0 text-[11px] text-zinc-600">{a.when}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const HEAT_CLS = ["bg-zinc-800/70", "bg-sky-500/25", "bg-sky-500/45", "bg-sky-500/70", "bg-sky-400"];

function Heatmap() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Constancia</h3>
        <span className="flex items-center gap-1.5 text-xs text-orange-400">
          <IconFlame size={14} /> {USER.streak} días
        </span>
      </div>
      <div className="mt-3.5 grid grid-flow-col grid-rows-7 gap-1">
        {HEATMAP.map((lvl, i) => (
          <span key={i} className={`h-3 w-3 rounded-[3px] ${HEAT_CLS[lvl]}`} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-zinc-600">
        Menos {HEAT_CLS.map((c, i) => <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${c}`} />)} Más
      </div>
    </div>
  );
}

export function Home({
  onOpen,
  onGo,
  onSeeAll,
  onMap,
}: {
  onOpen: () => void;
  onGo: () => void;
  onSeeAll: () => void;
  onMap: () => void;
}) {
  const preview = PROBLEMS.slice(0, 6);
  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Hola, {USER.name.split(" ")[0]} 👋</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Rango <span className={`font-medium ${USER.rankColor}`}>{USER.rank}</span> · {USER.solved} problemas resueltos. Sigamos donde lo dejaste.
          </p>
        </div>
        <button
          onClick={onMap}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
        >
          <IconRoute size={15} className="text-sky-400" /> Ver mapa de conocimiento
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={IconCircleCheck} label="Resueltos"    value={USER.solved} accent="bg-emerald-500/10 text-emerald-300" />
        <StatCard icon={IconTrendingUp}  label="Rating"       value={USER.rating} accent="bg-sky-500/10 text-sky-300" />
        <StatCard icon={IconFlame}       label="Racha (días)" value={USER.streak} accent="bg-orange-500/10 text-orange-300" />
        <StatCard icon={IconAward}       label="Rango"        value={USER.rank}   accent="bg-fuchsia-500/10 text-fuchsia-300" />
      </div>

      <div className="mt-4">
        <ContinueBanner onGo={onGo} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <IconList size={16} className="text-zinc-500" /> Problemas recomendados
            </h2>
            <button onClick={onSeeAll} className="flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300">
              Ver todos <IconArrowRight size={13} />
            </button>
          </div>
          <ProblemList items={preview} onOpen={onOpen} />
        </div>

        <div className="space-y-4">
          <SkillBars />
          <Heatmap />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
