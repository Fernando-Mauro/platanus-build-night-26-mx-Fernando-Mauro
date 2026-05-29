"use client";

import { useEffect, useRef, useState } from "react";
import { HighlightedCode } from "@/components/HighlightedCode";
import { LANGS, PROBLEM, SOLUTIONS, TEST_CASES, VERDICT } from "@/lib/data";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
  IconClock,
  IconCode,
  IconCpu,
  IconPlay,
  IconSend,
} from "@/lib/icons";

const DIFF_STYLES: Record<string, string> = {
  "Fácil": "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
};

type RunState = "idle" | "running" | "done";
type Mode = "run" | "submit";

function ProblemPanel({ onBack }: { onBack: () => void }) {
  return (
    <aside className="flex h-full w-[38%] min-w-[360px] max-w-[540px] flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800/70 px-6 py-3 text-xs">
        <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-zinc-100">
          <IconArrowLeft size={14} /> Roadmap
        </button>
        <span className="text-zinc-500">
          Aceptación <span className="font-mono text-zinc-300">{PROBLEM.acceptance}</span>
        </span>
      </div>

      <div className="px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          {PROBLEM.number}. {PROBLEM.title}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">{PROBLEM.subtitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${DIFF_STYLES[PROBLEM.difficulty]}`}>
            {PROBLEM.difficulty}
          </span>
          {PROBLEM.topics.map((t) => (
            <span key={t} className="rounded-md bg-zinc-800/70 px-2 py-0.5 text-xs text-zinc-400">{t}</span>
          ))}
        </div>

        <div className="mt-5 space-y-3 text-[13.5px] leading-relaxed text-zinc-300">
          {PROBLEM.statement.map((p, i) => (
            <p
              key={i}
              dangerouslySetInnerHTML={{
                __html: p.replace(
                  /(nums|target)/g,
                  '<code class="rounded bg-zinc-800/80 px-1 py-0.5 font-mono text-[12px] text-sky-300">$1</code>'
                ),
              }}
            />
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {PROBLEM.examples.map((ex, i) => (
            <div key={i}>
              <div className="mb-1.5 text-xs font-medium text-zinc-400">Ejemplo {i + 1}</div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 font-mono text-[12.5px] leading-relaxed">
                <div><span className="text-zinc-500">Entrada: </span><span className="text-zinc-200">{ex.input}</span></div>
                <div><span className="text-zinc-500">Salida: </span><span className="text-zinc-200">{ex.output}</span></div>
                {ex.explanation && (
                  <div className="mt-1 border-t border-zinc-800 pt-1 font-sans text-zinc-400">
                    <span className="text-zinc-500">Explicación: </span>{ex.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <div className="mb-2 text-xs font-medium text-zinc-400">Restricciones</div>
          <ul className="space-y-1.5">
            {PROBLEM.constraints.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-zinc-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                <code className="font-mono text-[12.5px] text-zinc-300">{c}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

function LangDropdown({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const current = LANGS.find((l) => l.id === lang)!;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700"
      >
        <IconCode size={14} className="text-zinc-500" />
        {current.label}
        <IconChevronDown size={13} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
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

function EditorPane({
  lang,
  setLang,
  onRun,
  onSubmit,
  running,
}: {
  lang: string;
  setLang: (l: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  running: boolean;
}) {
  const current = LANGS.find((l) => l.id === lang)!;
  return (
    <div className="flex min-h-0 flex-[1.7] flex-col border-b border-zinc-800 bg-[#0b0b0d]">
      <div className="flex items-center justify-between border-b border-zinc-800/70 bg-zinc-900/40 px-4 py-2">
        <div className="flex items-center gap-3">
          <LangDropdown lang={lang} setLang={setLang} />
          <span className="font-mono text-xs text-zinc-500">{current.file}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            disabled={running}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700/80 disabled:opacity-50"
          >
            <IconPlay size={13} /> Ejecutar
          </button>
          <button
            onClick={onSubmit}
            disabled={running}
            className="flex items-center gap-1.5 rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-sky-950 shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            <IconSend size={13} /> Enviar
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-4">
        <HighlightedCode code={SOLUTIONS[lang]} lang={lang} />
      </div>
    </div>
  );
}

function ConsolePane({
  runState,
  runMsg,
  mode,
  activeCase,
  setActiveCase,
}: {
  runState: RunState;
  runMsg: string;
  mode: Mode;
  activeCase: number;
  setActiveCase: (i: number) => void;
}) {
  const [tab, setTab] = useState<"resultado" | "casos">("resultado");
  useEffect(() => {
    if (runState === "running") setTab("resultado");
  }, [runState]);
  const done = runState === "done";
  const tc = TEST_CASES[activeCase];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
      <div className="flex items-center gap-1 border-b border-zinc-800/70 bg-zinc-900/40 px-3 py-1.5">
        {([["resultado", "Resultado"], ["casos", "Casos de prueba"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
        {done && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <IconCircleCheck size={14} /> {TEST_CASES.length}/{TEST_CASES.length} superados
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "resultado" && (
          <>
            {runState === "idle" && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-600">
                <IconPlay size={22} />
                <p className="text-sm">Ejecuta tu código para ver los resultados</p>
              </div>
            )}
            {runState === "running" && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-400">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-400" />
                <p className="text-sm font-medium">{runMsg}</p>
              </div>
            )}
            {done && (
              <div>
                <div className="flex items-center gap-2">
                  <IconCircleCheck size={22} className="text-emerald-400" />
                  <span className="text-lg font-semibold text-emerald-400">
                    {mode === "submit" ? "Aceptado" : "Ejecución correcta"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {mode === "submit"
                    ? "Tu solución superó los 57 casos de prueba."
                    : "Los 3 casos de muestra pasaron correctamente."}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500"><IconClock size={13} /> Tiempo</div>
                    <div className="mt-1 font-mono text-lg font-semibold text-zinc-100">{VERDICT.runtime}</div>
                    <div className="mt-0.5 text-[11px] text-emerald-400/80">{VERDICT.runtimePct}</div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500"><IconCpu size={13} /> Memoria</div>
                    <div className="mt-1 font-mono text-lg font-semibold text-zinc-100">{VERDICT.memory}</div>
                    <div className="mt-0.5 text-[11px] text-emerald-400/80">{VERDICT.memoryPct}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "casos" && (
          <div>
            <div className="flex flex-wrap gap-2">
              {TEST_CASES.map((c, i) => (
                <button
                  key={c.n}
                  onClick={() => setActiveCase(i)}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    activeCase === i ? "border-zinc-600 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {done ? <IconCheck size={12} className="text-emerald-400" /> : <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />}
                  Caso {c.n}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Entrada</div>
                <pre className="whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 font-mono text-[12.5px] text-zinc-200">{tc.input}</pre>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Esperado</div>
                  <pre className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 font-mono text-[12.5px] text-zinc-200">{tc.expected}</pre>
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Obtenido {done && <IconCheck size={12} className="text-emerald-400" />}
                  </div>
                  <pre className={`rounded-lg border p-3 font-mono text-[12.5px] ${done ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300" : "border-zinc-800 bg-zinc-900/60 text-zinc-500"}`}>
                    {done ? tc.got : "—"}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Workspace({ onBack }: { onBack: () => void }) {
  const [lang, setLang] = useState("cpp");
  const [runState, setRunState] = useState<RunState>("idle");
  const [runMsg, setRunMsg] = useState("");
  const [mode, setMode] = useState<Mode>("run");
  const [activeCase, setActiveCase] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const runSequence = (m: Mode) => {
    clearTimers();
    setMode(m);
    setRunState("running");
    setRunMsg("Compilando solución…");
    timers.current.push(setTimeout(() => setRunMsg("Ejecutando casos de prueba…"), 700));
    timers.current.push(setTimeout(() => setRunMsg(m === "submit" ? "Evaluando 57 casos ocultos…" : "Comparando salidas…"), 1300));
    timers.current.push(setTimeout(() => setRunState("done"), 2000));
  };

  // Changing language resets the judge.
  useEffect(() => {
    clearTimers();
    setRunState("idle");
  }, [lang]);

  return (
    <div className="flex h-full">
      <ProblemPanel onBack={onBack} />
      <section className="flex min-w-0 flex-1 flex-col">
        <EditorPane
          lang={lang}
          setLang={setLang}
          running={runState === "running"}
          onRun={() => runSequence("run")}
          onSubmit={() => runSequence("submit")}
        />
        <ConsolePane
          runState={runState}
          runMsg={runMsg}
          mode={mode}
          activeCase={activeCase}
          setActiveCase={setActiveCase}
        />
      </section>
    </div>
  );
}
