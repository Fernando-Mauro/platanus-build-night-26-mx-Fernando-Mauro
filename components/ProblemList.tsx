"use client";

import type { ProblemListItem, ProblemStatus } from "@/lib/data";
import {
  ICONS,
  IconChevronRight,
  IconTarget,
  type IconComponent,
} from "@/lib/icons";

const DIFF_BADGE: Record<string, string> = {
  "Fácil": "text-emerald-300",
  "Media": "text-amber-300",
  "Difícil": "text-rose-300",
};

const STATUS_META: Record<ProblemStatus, { icon: string | null; cls: string; label: string }> = {
  solved:    { icon: "IconCircleCheck", cls: "text-emerald-400", label: "Resuelto" },
  attempted: { icon: "IconActivity",    cls: "text-amber-400",   label: "Intentado" },
  todo:      { icon: null,              cls: "text-zinc-600",    label: "Pendiente" },
  locked:    { icon: "IconLock",        cls: "text-zinc-600",    label: "Bloqueado" },
};

function StatusGlyph({ status }: { status: ProblemStatus }) {
  const m = STATUS_META[status];
  const I: IconComponent | null = m.icon ? ICONS[m.icon] : null;
  if (!I)
    return (
      <span className="flex h-4 w-4 items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
      </span>
    );
  return <I size={16} className={m.cls} />;
}

function ProblemRow({ p, onOpen }: { p: ProblemListItem; onOpen: (p: ProblemListItem) => void }) {
  const locked = p.status === "locked";
  return (
    <button
      onClick={() => !locked && onOpen(p)}
      disabled={locked}
      className={`group grid w-full grid-cols-[24px_1fr_auto] items-center gap-4 px-4 py-3 text-left transition-colors ${
        locked ? "cursor-not-allowed opacity-50" : "hover:bg-zinc-900/70"
      }`}
    >
      <StatusGlyph status={p.status} />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-600 tabular-nums">
            {String(p.number).padStart(3, "0")}
          </span>
          <span className="truncate text-sm font-medium text-zinc-100 group-hover:text-white">
            {p.title}
          </span>
          {p.recommended && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
              <IconTarget size={10} strokeWidth={2.5} /> Sugerido
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 truncate">
          <span className="truncate text-xs text-zinc-500">{p.subtitle}</span>
          <span className="hidden items-center gap-1.5 sm:flex">
            {p.topics.map((t) => (
              <span key={t} className="rounded bg-zinc-800/70 px-1.5 py-0.5 text-[10px] text-zinc-400">
                {t}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <span className="hidden font-mono text-xs text-zinc-500 tabular-nums md:inline">
          {p.acceptance}
        </span>
        <span className={`w-14 text-right text-xs font-medium ${DIFF_BADGE[p.difficulty]}`}>
          {p.difficulty}
        </span>
        <IconChevronRight
          size={16}
          className={`text-zinc-700 transition-all ${
            locked ? "" : "group-hover:translate-x-0.5 group-hover:text-zinc-400"
          }`}
        />
      </div>
    </button>
  );
}

export function ProblemList({
  items,
  onOpen,
  header = true,
}: {
  items: ProblemListItem[];
  onOpen: (p: ProblemListItem) => void;
  header?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      {header && (
        <div className="grid grid-cols-[24px_1fr_auto] items-center gap-4 border-b border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          <span>Est.</span>
          <span>Problema</span>
          <span className="flex items-center gap-5">
            <span className="hidden md:inline">Aceptación</span>
            <span className="w-14 text-right">Dificultad</span>
            <span className="w-4" />
          </span>
        </div>
      )}
      <div className="divide-y divide-zinc-800/60">
        {items.map((p) => (
          <ProblemRow key={p.id} p={p} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}
