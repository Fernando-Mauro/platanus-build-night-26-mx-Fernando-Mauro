"use client";

import { useId, useState } from "react";
import {
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLock2,
  IconMail,
  IconSparkles,
  type IconComponent,
} from "@/lib/icons";

// Vértice brand mark: a tesseract (hypercube) — an outer cube face enclosing an
// inner cube, joined by the 4D struts. Drawn with the sky brand gradient + glow.
// Pure SVG so it scales cleanly everywhere (header, login, favicon).
export function BrandMark({ size = 36, title = "Vértice" }: { size?: number; title?: string }) {
  const uid = useId();
  const grad = `vtx-grad-${uid}`;
  const glow = `vtx-glow-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={grad} x1="6" y1="6" x2="94" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g
        stroke={`url(#${grad})`}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#${glow})`}
      >
        {/* 4D struts joining outer and inner cube corners */}
        <g strokeWidth="3.6" opacity="0.5">
          <line x1="16" y1="16" x2="39" y2="39" />
          <line x1="84" y1="16" x2="61" y2="39" />
          <line x1="84" y1="84" x2="61" y2="61" />
          <line x1="16" y1="84" x2="39" y2="61" />
        </g>
        {/* outer cube face */}
        <rect x="16" y="16" width="68" height="68" rx="6" strokeWidth="5.5" />
        {/* inner cube face */}
        <rect
          x="39"
          y="39"
          width="22"
          height="22"
          rx="3"
          strokeWidth="4.5"
          fill="#38bdf8"
          fillOpacity="0.18"
        />
      </g>
      {/* center vertex highlight */}
      <circle cx="50" cy="50" r="2.4" fill="#e0f2fe" />
    </svg>
  );
}

// Decorative animated graph for the brand panel.
function GraphMotif() {
  const nodes = [
    { x: 80,  y: 90,  r: 7, on: true },
    { x: 230, y: 60,  r: 5, on: false },
    { x: 320, y: 170, r: 8, on: true },
    { x: 150, y: 220, r: 6, on: true },
    { x: 60,  y: 300, r: 5, on: false },
    { x: 280, y: 320, r: 7, on: false },
    { x: 200, y: 410, r: 6, on: true },
    { x: 350, y: 380, r: 5, on: false },
  ];
  const edges = [[0, 1], [0, 3], [1, 2], [3, 2], [3, 4], [2, 5], [4, 6], [5, 6], [5, 7], [6, 7]];
  return (
    <svg viewBox="0 0 400 470" className="absolute inset-0 h-full w-full opacity-[0.9]" preserveAspectRatio="xMidYMid slice">
      {edges.map(([a, b], i) => {
        const s = nodes[a], e = nodes[b];
        const on = s.on && e.on;
        return <line key={i} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={on ? "#38bdf8" : "#3f3f46"} strokeWidth={on ? 1.5 : 1} opacity={on ? 0.55 : 0.4} />;
      })}
      {nodes.map((n, i) => (
        <g key={i}>
          {n.on && <circle cx={n.x} cy={n.y} r={n.r + 6} fill="#38bdf8" opacity="0.12" />}
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.on ? "#38bdf8" : "#27272a"} stroke={n.on ? "#7dd3fc" : "#3f3f46"} strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

function Field({
  icon: IconC,
  type = "text",
  placeholder,
  value,
  onChange,
  trailing,
}: {
  icon: IconComponent;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="group relative flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 transition-colors focus-within:border-sky-500/60 focus-within:bg-zinc-900">
      <span className="pl-3.5 text-zinc-500 group-focus-within:text-sky-400">
        <IconC size={16} />
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-transparent px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
      />
      {trailing}
    </div>
  );
}

type Mode = "signin" | "signup" | "confirm";

export function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Real sign-in via the Auth.js Credentials provider (Cognito USER_PASSWORD_AUTH).
  const doSignIn = async () => {
    const { signIn } = await import("next-auth/react");
    const res = await signIn("credentials", { email, password: pass, redirect: false });
    if (res?.error) {
      setError("Correo o contraseña incorrectos, o la cuenta no está verificada.");
    } else {
      onSignedIn();
    }
  };

  // Register: create the Cognito user, then switch to the confirm-code step.
  const doSignUp = async () => {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, name }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error ?? "No se pudo crear la cuenta.");
    } else {
      setInfo("Te enviamos un código de verificación a tu correo.");
      setMode("confirm");
    }
  };

  // Confirm the emailed code, then sign in automatically.
  const doConfirm = async () => {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error ?? "Código inválido.");
    } else {
      await doSignIn();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signin") await doSignIn();
      else if (mode === "signup") await doSignUp();
      else await doConfirm();
    } catch {
      setError("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid h-screen grid-cols-1 bg-zinc-950 lg:grid-cols-[1fr_1.05fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-12 lg:flex">
        <div className="absolute -right-24 top-1/4 h-[460px] w-[460px]">
          <GraphMotif />
        </div>
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-sky-500/10 blur-[100px]" />

        <div className="relative flex items-center gap-3">
          <BrandMark />
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-zinc-100">Vértice</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">Beta</span>
          </div>
        </div>

        <div className="relative max-w-md">
          <div className="flex items-center gap-1.5 text-xs font-medium text-sky-400">
            <IconSparkles size={14} /> Motor adaptativo bayesiano
          </div>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-zinc-100">
            Practica lo que <span className="text-sky-400">realmente</span> necesitas reforzar.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Vértice modela tu conocimiento como una red bayesiana y te guía hacia el siguiente problema con mayor impacto en tu aprendizaje.
          </p>
          <div className="mt-6 flex items-center gap-6 text-sm">
            <div><div className="whitespace-nowrap font-mono text-xl font-semibold text-zinc-100">2 400+</div><div className="text-xs text-zinc-500">Problemas</div></div>
            <span className="h-8 w-px bg-zinc-800" />
            <div><div className="font-mono text-xl font-semibold text-zinc-100">38</div><div className="text-xs text-zinc-500">Temas mapeados</div></div>
            <span className="h-8 w-px bg-zinc-800" />
            <div><div className="font-mono text-xl font-semibold text-zinc-100">3</div><div className="text-xs text-zinc-500">Lenguajes</div></div>
          </div>
        </div>

        <p className="relative text-xs text-zinc-600">© 2026 Vértice · Plataforma de juicio adaptativo</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark size={32} />
            <span className="text-lg font-semibold tracking-tight text-zinc-100">Vértice</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Bienvenida de vuelta</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Inicia sesión para continuar tu camino de aprendizaje.</p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <button onClick={onAuth} className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              Google
            </button>
            <button onClick={onAuth} className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
              <IconGithub size={16} /> GitHub
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-zinc-600">
            <span className="h-px flex-1 bg-zinc-800" /> o con tu correo <span className="h-px flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Correo electrónico</label>
              <Field icon={IconMail} type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">Contraseña</label>
                <a href="#" onClick={(e) => e.preventDefault()} className="whitespace-nowrap text-xs text-sky-400 hover:text-sky-300">¿Olvidaste tu contraseña?</a>
              </div>
              <Field
                icon={IconLock2}
                type={show ? "text" : "password"}
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                trailing={
                  <button type="button" onClick={() => setShow((s) => !s)} className="px-3 text-zinc-500 transition-colors hover:text-zinc-300">
                    {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-sky-950 shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-400 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-900/40 border-t-sky-900" />{" "}
                  <span className="whitespace-nowrap">Entrando…</span>
                </>
              ) : (
                <>
                  <span className="whitespace-nowrap">Iniciar sesión</span> <IconArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            ¿No tienes cuenta?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); onAuth(); }} className="font-medium text-sky-400 hover:text-sky-300">
              Crea una gratis
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
