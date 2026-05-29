"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark, Login } from "@/features/auth/Login";
import { Home } from "@/features/home/Home";
import { Problems } from "@/features/problems/Problems";
import { Roadmap } from "@/features/roadmap/Roadmap";
import { Workspace } from "@/features/workspace/Workspace";
import { USER } from "@/lib/data";
import {
  IconAward,
  IconBookOpen,
  IconFlame,
  IconHome,
  IconList,
  IconLogOut,
  IconRoute,
  IconTrendingUp,
  IconUser,
  type IconComponent,
} from "@/lib/icons";

type View = "home" | "problems" | "map" | "workspace";

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5">
      <BrandMark size={28} />
      <div className="flex items-center gap-2">
        <span className="text-[15px] font-semibold tracking-tight text-zinc-100">Vértice</span>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">Beta</span>
      </div>
    </button>
  );
}

function Nav({ view, go }: { view: View; go: (v: View) => void }) {
  const items: [View, string, IconComponent][] = [
    ["home", "Inicio", IconHome],
    ["problems", "Problemas", IconList],
    ["map", "Mapa", IconRoute],
  ];
  const active = view === "workspace" ? "problems" : view;
  return (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
      {items.map(([id, label, IconC]) => (
        <button
          key={id}
          onClick={() => go(id)}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            active === id ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <IconC size={15} /> <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const menuItems: [IconComponent, string][] = [
    [IconUser, "Mi perfil"],
    [IconAward, "Logros"],
    [IconBookOpen, "Mis envíos"],
  ];
  return (
    <div className="flex items-center gap-4">
      <span className="hidden items-center gap-1.5 text-sm text-zinc-300 sm:flex">
        <IconFlame size={15} className="text-orange-400" /> <span className="font-medium">{USER.streak}</span>
        <span className="text-zinc-500">días</span>
      </span>
      <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
      <span className="hidden items-center gap-1.5 text-sm sm:flex">
        <IconTrendingUp size={15} className="text-sky-400" />
        <span className="font-mono font-medium text-zinc-200">{USER.rating}</span>
      </span>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-700 transition-all hover:ring-zinc-600"
        >
          {USER.initials}
        </button>
        {open && (
          <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 px-2.5 py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-700">{USER.initials}</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-100">{USER.name}</div>
                <div className="truncate text-xs text-zinc-500">{USER.handle}</div>
              </div>
            </div>
            <div className="my-1 h-px bg-zinc-800" />
            {menuItems.map(([I, label]) => (
              <button key={label} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800">
                <I size={15} className="text-zinc-500" /> {label}
              </button>
            ))}
            <div className="my-1 h-px bg-zinc-800" />
            <button onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-rose-400 transition-colors hover:bg-rose-500/10">
              <IconLogOut size={15} /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<View>("home");

  const go = (v: View) => setView(v);
  const openProblem = () => setView("workspace");

  if (!authed) return <Login onAuth={() => { setAuthed(true); setView("home"); }} />;

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-300">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-5 backdrop-blur-md">
        <Logo onClick={() => go("home")} />
        <Nav view={view} go={go} />
        <UserMenu onLogout={() => { setAuthed(false); setView("home"); }} />
      </header>
      <main className="min-h-0 flex-1">
        {view === "home" && <Home onOpen={openProblem} onGo={openProblem} onSeeAll={() => go("problems")} onMap={() => go("map")} />}
        {view === "problems" && <Problems onOpen={openProblem} />}
        {view === "map" && <Roadmap onOpen={openProblem} onGo={openProblem} />}
        {view === "workspace" && <Workspace onBack={() => go("problems")} />}
      </main>
    </div>
  );
}
