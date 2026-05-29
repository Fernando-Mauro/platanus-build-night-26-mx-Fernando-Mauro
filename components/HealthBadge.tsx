"use client";

import { useEffect, useState } from "react";

type Ping = { status: string; db: string; judge0: string };

// Walking-skeleton health indicator (T011): calls /api/ping on load and shows a
// small dot (green = both DB + Judge0 reachable). Makes the end-to-end skeleton
// visible in the browser. Remove or replace once the real product is wired.
export function HealthBadge() {
  const [state, setState] = useState<"loading" | "ok" | "degraded" | "down">("loading");
  const [detail, setDetail] = useState<string>("comprobando…");

  useEffect(() => {
    let alive = true;
    fetch("/api/ping", { cache: "no-store" })
      .then((r) => r.json() as Promise<Ping>)
      .then((p) => {
        if (!alive) return;
        setState(p.status === "ok" ? "ok" : "degraded");
        setDetail(`BD ${p.db} · Judge0 ${p.judge0}`);
      })
      .catch(() => {
        if (!alive) return;
        setState("down");
        setDetail("API sin respuesta");
      });
    return () => {
      alive = false;
    };
  }, []);

  const color =
    state === "ok" ? "bg-emerald-400" : state === "loading" ? "bg-zinc-500" : "bg-rose-400";

  return (
    <span
      title={detail}
      className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[11px] text-zinc-400"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${color} ${state === "loading" ? "animate-pulse" : ""}`} />
      <span className="hidden sm:inline">{detail}</span>
    </span>
  );
}
