"use client";

import { useState } from "react";
import {
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLock2,
  IconMail,
  IconSparkles,
  type IconComponent,
} from "@/lib/icons";

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span className="relative flex items-center justify-center" style={{ height: size, width: size }}>
      <span className="absolute inset-0 rotate-45 rounded-[10px] bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/30" />
      <span className="absolute inset-[7px] rotate-45 rounded-[5px] border border-sky-200/40" />
    </span>
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

  const heading =
    mode === "signin" ? "Bienvenido de vuelta" : mode === "signup" ? "Crea tu cuenta" : "Verifica tu correo";
  const subheading =
    mode === "signin"
      ? "Inicia sesión para continuar tu camino de aprendizaje."
      : mode === "signup"
      ? "Regístrate para empezar a practicar."
      : "Ingresa el código que enviamos a tu correo.";
  const cta = mode === "signin" ? "Iniciar sesión" : mode === "signup" ? "Crear cuenta" : "Verificar";

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

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">{heading}</h1>
          <p className="mt-1.5 text-sm text-zinc-500">{subheading}</p>

          {error && (
            <div className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">{error}</div>
          )}
          {info && (
            <div className="mt-5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-300">{info}</div>
          )}

          <form onSubmit={submit} className="mt-7 space-y-3.5">
            {mode === "confirm" ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Código de verificación</label>
                <Field icon={IconMail} type="text" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
            ) : (
              <>
                {mode === "signup" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-400">Nombre</label>
                    <Field icon={IconMail} type="text" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Correo electrónico</label>
                  <Field icon={IconMail} type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Contraseña</label>
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
                  {mode === "signup" && (
                    <p className="mt-1.5 text-[11px] text-zinc-600">Mínimo 8 caracteres, con mayúscula, minúscula y número.</p>
                  )}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-sky-950 shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-400 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-900/40 border-t-sky-900" />{" "}
                  <span className="whitespace-nowrap">Procesando…</span>
                </>
              ) : (
                <>
                  <span className="whitespace-nowrap">{cta}</span> <IconArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {mode === "signin" ? (
              <>¿No tienes cuenta?{" "}
                <button onClick={() => { setMode("signup"); setError(null); setInfo(null); }} className="font-medium text-sky-400 hover:text-sky-300">
                  Crea una gratis
                </button>
              </>
            ) : (
              <>¿Ya tienes cuenta?{" "}
                <button onClick={() => { setMode("signin"); setError(null); setInfo(null); }} className="font-medium text-sky-400 hover:text-sky-300">
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
