"use client";

import { useEffect, useState } from "react";
import {
  fetchProblem,
  fetchProblems,
  submitSolution,
  type ProblemDetail,
  type SubmissionResponse,
} from "@/lib/api/vertice";
import { LANGS } from "@/lib/data";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
  IconClock,
  IconCpu,
  IconPlay,
  IconSend,
  IconTarget,
} from "@/lib/icons";

const DIFF_STYLES: Record<string, string> = {
  "Fácil": "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  "Media": "bg-amber-500/10 text-amber-300 border-amber-500/20",
  "Difícil": "bg-rose-500/10 text-rose-300 border-rose-500/20",
};

type SubmitState = "idle" | "running" | "done" | "error";

const VERDICT_UI: Record<
  SubmissionResponse["verdict"],
  { label: string; color: string; ok: boolean }
> = {
  PASSED: { label: "Aceptado", color: "text-emerald-400", ok: true },
  FAILED: { label: "Incorrecto", color: "text-rose-400", ok: false },
  LIMIT_EXCEEDED: { label: "Tiempo límite excedido", color: "text-amber-400", ok: false },
  ERROR: { label: "Error de evaluación", color: "text-zinc-400", ok: false },
  PENDING: { label: "Pendiente", color: "text-zinc-400", ok: false },
};

function LangDropdown({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700/60"
      >
        {current.label} <IconChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-xl shadow-black/40">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => { setLang(l.id); setOpen(false); }}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                l.id === lang ? "bg-sky-500/15 text-sky-300" : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {l.label}
              {l.id === lang && <IconCheck size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProblemPanel({ problem, onBack }: { problem: ProblemDetail | null; onBack: () => void }) {
  return (
    <aside className="flex h-full w-[38%] min-w-[360px] max-w-[540px] flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800/70 px-6 py-3 text-xs">
        <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-zinc-100">
          <IconArrowLeft size={14} /> Roadmap
        </button>
        <span className="text-zinc-500">{problem ? `${problem.totalTests} casos` : ""}</span>
      </div>
      {!problem ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Cargando problema…</div>
      ) : (
        <div className="px-6 py-5">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{problem.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${DIFF_STYLES[problem.difficulty] ?? DIFF_STYLES["Media"]}`}>
              {problem.difficulty}
            </span>
            {problem.competencies.map((c) => (
              <span key={c.id} className="rounded-md bg-zinc-800/70 px-2 py-0.5 text-xs text-zinc-400">{c.name}</span>
            ))}
          </div>
          <div className="mt-5 whitespace-pre-line text-[13.5px] leading-relaxed text-zinc-300">
            {problem.statement}
          </div>
          {problem.sampleTests.length > 0 && (
            <div className="mt-5 space-y-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Ejemplos</div>
              {problem.sampleTests.map((t, i) => (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-[12.5px]">
                  <div className="text-zinc-500">Entrada</div>
                  <pre className="mt-1 whitespace-pre-wrap font-mono text-zinc-200">{t.input}</pre>
                  <div className="mt-2 text-zinc-500">Salida esperada</div>
                  <pre className="mt-1 whitespace-pre-wrap font-mono text-zinc-200">{t.expectedOutput}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function ConsolePane({ state, result }: { state: SubmitState; result: SubmissionResponse | null }) {
  const v = result ? VERDICT_UI[result.verdict] : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
      <div className="flex items-center gap-1 border-b border-zinc-800/70 bg-zinc-900/40 px-3 py-1.5">
        <span className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-100">Resultado</span>
        {state === "done" && result && v && (
          <span className={`ml-auto flex items-center gap-1.5 text-xs font-medium ${v.color}`}>
            <IconCircleCheck size={14} /> {result.passedCount}/{result.totalCount} superados
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {state === "idle" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-600">
            <IconPlay size={22} />
            <p className="text-sm">Envía tu código para evaluarlo en Judge0</p>
          </div>
        )}
        {state === "running" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-400">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-400" />
            <p className="text-sm font-medium">Compilando y evaluando en Judge0…</p>
          </div>
        )}
        {state === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
            <p className="text-sm">No se pudo evaluar. Intenta de nuevo.</p>
          </div>
        )}
        {state === "done" && result && v && (
          <div>
            <div className="flex items-center gap-2">
              <IconCircleCheck size={22} className={v.color} />
              <span className={`text-lg font-semibold ${v.color}`}>{v.label}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {result.passedCount} de {result.totalCount} casos superados
              {result.runtimeMs !== null ? ` · ${result.runtimeMs} ms` : ""}
            </p>

            {result.masteryDelta.length > 0 && (
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Actualización de maestría
                </div>
                <div className="mt-2 space-y-1.5">
                  {result.masteryDelta.map((d) => {
                    const up = d.after >= d.before;
                    return (
                      <div key={d.competency} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300">{d.competency}</span>
                        <span className={`font-mono ${up ? "text-emerald-400" : "text-rose-400"}`}>
                          {d.before}% → {d.after}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {result.gating.lockedTopic && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-sm text-amber-200">
                <IconTarget size={15} className="mt-0.5 shrink-0" />
                <span>
                  Se bloqueó <span className="font-medium">{result.gating.lockedTopic}</span>.
                  {result.gating.reason === "PREREQUISITE_GAP" && " Refuerza el prerequisito recomendado en tu roadmap."}
                </span>
              </div>
            )}

            {result.verdict === "PASSED" && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500"><IconClock size={13} /> Tiempo</div>
                  <div className="mt-1 font-mono text-lg font-semibold text-zinc-100">{result.runtimeMs ?? "—"} ms</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500"><IconCpu size={13} /> Casos</div>
                  <div className="mt-1 font-mono text-lg font-semibold text-zinc-100">{result.passedCount}/{result.totalCount}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Workspace({
  onBack,
  problemId,
  onSubmitted,
}: {
  onBack: () => void;
  problemId?: number | null;
  onSubmitted?: () => void;
}) {
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [lang, setLang] = useState("cpp");
  const [code, setCode] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [result, setResult] = useState<SubmissionResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let id = problemId ?? null;
        if (id === null) {
          const list = await fetchProblems();
          id = list[0]?.id ?? null;
        }
        if (id === null) return;
        const detail = await fetchProblem(id);
        if (cancelled) return;
        setProblem(detail);
        setCode(detail.starterCode ?? "");
        setState("idle");
        setResult(null);
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [problemId]);

  const onSubmit = async () => {
    if (!problem || !code.trim()) return;
    setState("running");
    setResult(null);
    try {
      const res = await submitSolution({ problemId: problem.id, sourceCode: code, lang });
      setResult(res);
      setState("done");
      onSubmitted?.();
    } catch {
      setState("error");
    }
  };

  const running = state === "running";

  return (
    <div className="flex h-full">
      <ProblemPanel problem={problem} onBack={onBack} />
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-[1.7] flex-col border-b border-zinc-800 bg-[#0b0b0d]">
          <div className="flex items-center justify-between border-b border-zinc-800/70 bg-zinc-900/40 px-4 py-2">
            <div className="flex items-center gap-3">
              <LangDropdown lang={lang} setLang={setLang} />
              <span className="font-mono text-xs text-zinc-500">
                {LANGS.find((l) => l.id === lang)?.file}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onSubmit}
                disabled={running || !problem}
                className="flex items-center gap-1.5 rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-sky-950 shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-400 disabled:opacity-60"
              >
                <IconSend size={13} /> {running ? "Evaluando…" : "Enviar"}
              </button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder="Escribe tu solución aquí…"
            className="min-h-0 flex-1 resize-none bg-[#0b0b0d] p-4 font-mono text-[13px] leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </div>
        <ConsolePane state={state} result={result} />
      </section>
    </div>
  );
}
