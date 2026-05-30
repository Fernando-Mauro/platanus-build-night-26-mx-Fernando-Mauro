"use client";

import { useEffect, useState } from "react";
import { ProblemList } from "@/components/ProblemList";
import { fetchProblems, type ProblemListItem } from "@/lib/api/vertice";
import { IconList, IconSearch } from "@/lib/icons";

const FILTERS = ["Todos", "Fáciles", "Medios", "Difíciles", "Pendientes"] as const;
type Filter = (typeof FILTERS)[number];

const DIFF_OF: Partial<Record<Filter, string>> = {
  Fáciles: "Fácil",
  Medios: "Media",
  Difíciles: "Difícil",
};

function FilterBar({ active, setActive }: { active: Filter; setActive: (f: Filter) => void }) {
  return (
    <div className="flex items-center gap-2">
      {FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => setActive(f)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            active === f ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

export function Problems({ onOpen }: { onOpen: (id: number) => void }) {
  const [active, setActive] = useState<Filter>("Todos");
  const [items, setItems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchProblems()
      .then((p) => { if (!cancelled) setItems(p); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = items.filter((p) => {
    if (active === "Pendientes" && p.solved) return false;
    const diff = DIFF_OF[active];
    if (diff && p.difficulty !== diff) return false;
    if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Problemas</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Practica y refuerza tus competencias</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-sm text-zinc-400">
          <IconSearch size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="w-32 bg-transparent text-zinc-200 outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>
      <div className="mb-5 flex items-center justify-between">
        <FilterBar active={active} setActive={setActive} />
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <IconList size={14} /> {filtered.length} problemas
        </span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-zinc-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-400" />
          Cargando problemas…
        </div>
      ) : (
        <ProblemList items={filtered} onOpen={onOpen} />
      )}
    </div>
  );
}
