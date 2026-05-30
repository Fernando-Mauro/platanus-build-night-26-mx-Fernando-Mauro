"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { HealthBadge } from "@/components/HealthBadge";
import { BrandMark, Login } from "@/features/auth/Login";
import { Home } from "@/features/home/Home";
import { Problems } from "@/features/problems/Problems";
import { Roadmap } from "@/features/roadmap/Roadmap";
import { Workspace } from "@/features/workspace/Workspace";
import {
  IconAward,
  IconBookOpen,
  IconHome,
  IconList,
  IconLogOut,
  IconRoute,
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

function UserMenu({
  user,
  onLogout,
}: {
  user: { name: string; email: string; initials: string };
  onLogout: () => void;
}) {
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
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-700 transition-all hover:ring-zinc-600"
        >
          {user.initials}
        </button>
        {open && (
          <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 px-2.5 py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-700">{user.initials}</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-100">{user.name}</div>
                <div className="truncate text-xs text-zinc-500">{user.email}</div>
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
  const { data: session, status } = useSession();
  const [view, setView] = useState<View>("home");
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null);
  const [roadmapSignal, setRoadmapSignal] = useState(0);

  const go = (v: View) => setView(v);
  // Open a problem: an explicit id, or a roadmap node carrying its recommended
  // problem id, else null (Workspace falls back to the first seeded problem).
  const openProblem = (arg?: unknown) => {
    let id: number | null = null;
    if (typeof arg === "number") id = arg;
    else if (arg && typeof arg === "object" && "recommendedProblemId" in arg) {
      const r = (arg as { recommendedProblemId?: number | null }).recommendedProblemId;
      id = typeof r === "number" ? r : null;
    }
    setSelectedProblemId(id);
    setView("workspace");
  };
  const bumpRoadmap = () => setRoadmapSignal((s) => s + 1);

  // Real auth: unauthenticated → show Login. Login handles local
  // sign-in/registration itself; on success it refreshes the session so this
  // component re-renders authenticated.
  if (status !== "authenticated") {
    return <Login onSignedIn={() => window.location.reload()} />;
  }

  const displayName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "Estudiante";
  const initials =
    displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U";
  const sessionUser = { name: displayName, email: session?.user?.email || "", initials };

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-300">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-5 backdrop-blur-md">
        <Logo onClick={() => go("home")} />
        <Nav view={view} go={go} />
        <div className="flex items-center gap-3">
          <HealthBadge />
          <UserMenu user={sessionUser} onLogout={() => signOut({ callbackUrl: "/" })} />
        </div>
      </header>
      <main className="min-h-0 flex-1">
        {view === "home" && <Home onOpen={openProblem} onGo={openProblem} onSeeAll={() => go("problems")} onMap={() => go("map")} />}
        {view === "problems" && <Problems onOpen={openProblem} />}
        {view === "map" && <Roadmap onOpen={openProblem} refreshSignal={roadmapSignal} />}
        {view === "workspace" && (
          <Workspace
            onBack={() => go("map")}
            problemId={selectedProblemId}
            onSubmitted={bumpRoadmap}
          />
        )}
      </main>
    </div>
  );
}
