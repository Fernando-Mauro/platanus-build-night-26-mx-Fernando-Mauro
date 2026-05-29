"use client";

import { useMemo, useState } from "react";
import { ProblemList } from "@/components/ProblemList";
import { PROBLEMS } from "@/lib/data";
import { IconFilter, IconSearch } from "@/lib/icons";

const DIFFS = ["Todas", "Fácil", "Media", "Difícil"];
const STATUSES: [string, string][] = [
  ["all", "Todos"],
  ["todo", "Pendientes"],
  ["solved", "Resueltos"],
  ["attempted", "Intentados"],
];

function FilterPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

export function Problems({ onOpen }: { onOpen: () => void }) {
  const [diff, setDiff] = useState("Todas");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      PROBLEMS.filter((p) => {
        if (diff !== "Todas" && p.difficulty !== diff) return false;
        if (status !== "all" && p.status !== status) return false;
        if (query && !`${p.title} ${p.subtitle} ${p.topics.join(" ")}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [diff, status, query]
  );

  const solved = PROBLEMS.filter((p) => p.status === "solved").length;

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Problemas</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Has resuelto <span className="font-medium text-emerald-300">{solved}</span> de{" "}
            <span className="text-zinc-300">{PROBLEMS.length}</span> en esta colección.
          </p>
        </div>
        <div className="relative">
          <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar problema o tema…"
            className="w-64 rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-1">
          {DIFFS.map((d) => (
            <FilterPill key={d} active={diff === d} onClick={() => setDiff(d)}>{d}</FilterPill>
          ))}
        </div>
        <span className="h-5 w-px bg-zinc-800" />
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-1">
          {STATUSES.map(([id, label]) => (
            <FilterPill key={id} active={status === id} onClick={() => setStatus(id)}>{label}</FilterPill>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {filtered.length > 0 ? (
          <ProblemList items={filtered} onOpen={onOpen} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 py-16 text-center text-zinc-600">
            <IconFilter size={20} />
            <p className="text-sm">Ningún problema coincide con tus filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
}
