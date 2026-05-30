"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ProblemList } from "@/components/ProblemList";
import {
  fetchActivity,
  fetchProblems,
  fetchRoadmap,
  type ActivityItem,
  type ProblemListItem,
  type RoadmapCompetency,
  type RoadmapResponse,
} from "@/lib/api/vertice";
import {
  IconArrowRight,
  IconAward,
  IconCircleCheck,
  IconList,
  IconNetwork,
  IconPlay,
  IconRoute,
  IconTarget,
  IconTrendingUp,
  IconX,
  type IconComponent,
} from "@/lib/icons";

function firstNameFrom(name?: string | null, email?: string | null): string {
  if (name && name.trim()) return name.trim().split(" ")[0];
  if (email) return email.split("@")[0];
  return "estudiante";
}

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

function ContinueBanner({
  title,
  subtitle,
  onGo,
}: {
  title: string;
  subtitle: string;
  onGo: () => void;
}) {
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
        <div className="mt-0.5 truncate text-[15px] font-semibold text-zinc-100">{title}</div>
        <div className="truncate text-xs text-zinc-400">{subtitle}</div>
      </div>
      <IconArrowRight size={18} className="relative shrink-0 text-sky-400 transition-transform group-hover:translate-x-1" />
    </button>
  );
}

const BAR_CLS: Record<string, string> = {
  MASTERED: "bg-emerald-400",
  RECOMMENDED: "bg-sky-400",
  AVAILABLE: "bg-amber-400",
  LOCKED: "bg-zinc-600",
};

function SkillBars({ items }: { items: RoadmapCompetency[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Dominio por competencia</h3>
        <IconNetwork size={15} className="text-zinc-600" />
      </div>
      <div className="mt-3.5 space-y-3">
        {items.length === 0 && <div className="text-xs text-zinc-500">Cargando…</div>}
        {items.map((t) => (
          <div key={t.id}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-zinc-400">{t.name}</span>
              <span className="font-mono text-zinc-300 tabular-nums">{Math.round(t.pMastery)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${BAR_CLS[t.status] ?? "bg-zinc-600"}`}
                style={{ width: `${Math.round(t.pMastery)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diffMs = new Date().getTime() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">Actividad reciente</h3>
      <div className="mt-3 space-y-3">
        {items.length === 0 && (
          <div className="text-xs text-zinc-500">Aún no has enviado soluciones. ¡Empieza ahora!</div>
        )}
        {items.map((a) => {
          const ok = a.verdict === "PASSED";
          return (
            <div key={a.id} className="flex items-center gap-3">
              <span className={`mt-0.5 shrink-0 ${ok ? "text-emerald-400" : "text-rose-400"}`}>
                {ok ? <IconCircleCheck size={16} /> : <IconX size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-zinc-200">{a.title}</div>
                <div className="truncate text-[11px] text-zinc-500">
                  {ok ? "Aceptado" : `${a.passedCount}/${a.totalCount} casos`}
                </div>
              </div>
              <span className="shrink-0 text-[11px] text-zinc-600">{relativeTime(a.createdAt)}</span>
            </div>
          );
        })}
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
  onOpen: (id: number) => void;
  onGo: (problemId?: number) => void;
  onSeeAll: () => void;
  onMap: () => void;
}) {
  const { data: session } = useSession();
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchRoadmap().then((r) => !cancelled && setRoadmap(r)).catch(() => {});
    fetchProblems().then((p) => !cancelled && setProblems(p)).catch(() => {});
    fetchActivity().then((a) => !cancelled && setActivity(a)).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const firstName = firstNameFrom(session?.user?.name, session?.user?.email);
  const comps = roadmap?.competencies ?? [];
  const solvedCount = problems.filter((p) => p.solved).length;
  const masteredCount = comps.filter((c) => c.status === "MASTERED").length;
  const avgMastery = comps.length
    ? Math.round(comps.reduce((s, c) => s + c.pMastery, 0) / comps.length)
    : 0;

  const reco = roadmap?.recommendation ?? null;
  const recoProblem = reco?.problemId ? problems.find((p) => p.id === reco.problemId) : undefined;
  const continueTitle = recoProblem
    ? recoProblem.title
    : reco
      ? `Reforzar ${reco.competencyName}`
      : "Explora el roadmap";
  const continueSubtitle = reco
    ? reco.reason === "PREREQUISITE_GAP"
      ? `Refuerza ${reco.competencyName} — tu punto más débil`
      : `Continúa con ${reco.competencyName}`
    : "Sugerido por tu modelo bayesiano";

  // Recommended list: unsolved problems first, capped at 6.
  const preview = [...problems].sort((a, b) => Number(a.solved) - Number(b.solved)).slice(0, 6);

  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Hola, {firstName} 👋</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {solvedCount > 0
              ? <>Llevas <span className="font-medium text-zinc-300">{solvedCount}</span> problemas resueltos. Sigamos donde lo dejaste.</>
              : <>Aún no resuelves problemas. ¡Empecemos por tu recomendación!</>}
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
        <StatCard icon={IconCircleCheck} label="Resueltos"             value={solvedCount}                          accent="bg-emerald-500/10 text-emerald-300" />
        <StatCard icon={IconAward}       label="Competencias dominadas" value={`${masteredCount}/${comps.length || 0}`} accent="bg-fuchsia-500/10 text-fuchsia-300" />
        <StatCard icon={IconTrendingUp}  label="Maestría promedio"      value={`${avgMastery}%`}                     accent="bg-sky-500/10 text-sky-300" />
        <StatCard icon={IconTarget}      label="Recomendado"            value={reco?.competencyName ?? "—"}          accent="bg-amber-500/10 text-amber-300" />
      </div>

      <div className="mt-4">
        <ContinueBanner title={continueTitle} subtitle={continueSubtitle} onGo={() => onGo(reco?.problemId ?? undefined)} />
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
          <SkillBars items={comps} />
          <RecentActivity items={activity} />
        </div>
      </div>
    </div>
  );
}
