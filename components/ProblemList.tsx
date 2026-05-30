"use client";

import type { ProblemListItem } from "@/lib/api/vertice";
import { IconCircleCheck, IconTarget } from "@/lib/icons";

type Props = {
  items: ProblemListItem[];
  onOpen: (id: number) => void;
};

const DIFF_CLS: Record<string, string> = {
  "Fácil": "text-emerald-400",
  "Media": "text-amber-400",
  "Difícil": "text-rose-400",
};

function StatusIcon({ item }: { item: ProblemListItem }) {
  const base = "shrink-0";
  if (item.solved) return <IconCircleCheck size={18} className={`${base} text-emerald-400`} />;
  if (item.attempts > 0) return <IconTarget size={18} className={`${base} text-amber-400`} />;
  return (
    <span className={`${base} flex h-[18px] w-[18px] items-center justify-center`}>
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
    </span>
  );
}

function ProblemRow({ item, onOpen }: { item: ProblemListItem; onOpen: (id: number) => void }) {
  return (
    <button
      onClick={() => onOpen(item.id)}
      className="group flex w-full items-center gap-4 border-b border-zinc-800/60 px-2 py-3 text-left transition-colors hover:bg-zinc-900/40"
    >
      <StatusIcon item={item} />
      <span className="w-10 shrink-0 font-mono text-xs text-zinc-600">#{item.id}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-200 group-hover:text-white">{item.title}</div>
        <div className="truncate text-xs text-zinc-500">
          {item.competencies.map((c) => c.name).join(" · ") || "Competencia"}
        </div>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        {item.competencies.slice(0, 2).map((c) => (
          <span key={c.id} className="rounded bg-zinc-800/70 px-2 py-0.5 text-[11px] text-zinc-400">{c.name}</span>
        ))}
      </div>
      <span className={`w-16 shrink-0 text-right text-xs font-medium ${DIFF_CLS[item.difficulty] ?? "text-zinc-400"}`}>
        {item.difficulty}
      </span>
    </button>
  );
}

export function ProblemList({ items, onOpen }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
        No hay problemas para mostrar.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      {items.map((item) => (
        <ProblemRow key={item.id} item={item} onOpen={onOpen} />
      ))}
    </div>
  );
}
