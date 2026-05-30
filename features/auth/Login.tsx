"use client";

import { useId, useState } from "react";
import { signIn } from "next-auth/react";

type Mode = "signin" | "signup";

interface LoginProps {
  onSignedIn?: () => void;
}

// Vértice brand mark: a tesseract (hypercube) — an outer cube face enclosing an
// inner cube, joined by the 4D struts. Drawn with the sky brand gradient + glow.
// Pure SVG so it scales cleanly everywhere (header, login, favicon).
export function BrandMark({ size = 32, title = "Vértice" }: { size?: number; title?: string }) {
  const uid = useId();
  const grad = `vtx-grad-${uid}`;
  const glow = `vtx-glow-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" role="img" aria-label={title}>
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
      <g stroke={`url(#${grad})`} strokeLinejoin="round" strokeLinecap="round" filter={`url(#${glow})`}>
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
        <rect x="39" y="39" width="22" height="22" rx="3" strokeWidth="4.5" fill="#38bdf8" fillOpacity="0.18" />
      </g>
      {/* center vertex highlight */}
      <circle cx="50" cy="50" r="2.4" fill="#e0f2fe" />
    </svg>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
    </div>
  );
}

export function Login({ onSignedIn }: LoginProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function doSignIn() {
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Correo o contraseña incorrectos.");
      return false;
    }
    onSignedIn?.();
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo registrar.");
        // Auto sign-in right after registering.
        await doSignIn();
      } else {
        await doSignIn();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <BrandMark size={40} />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-zinc-100">Vértice</h1>
          <p className="mt-1 text-sm text-zinc-500">Tu camino adaptativo al dominio</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="mb-5 flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "signin" ? "bg-sky-500 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "signup" ? "bg-sky-500 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Correo" type="email" value={email} onChange={setEmail} placeholder="tu@correo.com" autoComplete="email" />
            <Field label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? "Procesando…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
