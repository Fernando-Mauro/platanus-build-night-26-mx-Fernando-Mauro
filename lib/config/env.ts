// Server-only environment loader/validator.
// MUST NOT be imported by client components — these values include secrets
// (Constitution Principle II: secrets never reach the client bundle).
import "server-only";

type ServerEnv = {
  DATABASE_URL: string;
  JUDGE0_URL: string;
  // Self-hosted Judge0 uses X-Auth-Token; Judge0 CE on RapidAPI uses
  // X-RapidAPI-Key + X-RapidAPI-Host. Both optional so a public/keyless Judge0
  // also works. Empty string = header omitted.
  JUDGE0_AUTHN_TOKEN: string;
  JUDGE0_RAPIDAPI_KEY: string;
  JUDGE0_RAPIDAPI_HOST: string;
  AUTH_SECRET: string;
};

// Only these MUST be present at runtime; the rest default to "".
const REQUIRED: (keyof ServerEnv)[] = ["DATABASE_URL", "JUDGE0_URL", "AUTH_SECRET"];

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    // During `next build` the runtime env isn't present; don't crash the build.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return {
        DATABASE_URL: "", JUDGE0_URL: "", JUDGE0_AUTHN_TOKEN: "",
        JUDGE0_RAPIDAPI_KEY: "", JUDGE0_RAPIDAPI_HOST: "", AUTH_SECRET: "",
      };
    }
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Set them in .env.local (local) or the Vercel project settings.`
    );
  }
  cached = {
    DATABASE_URL: process.env.DATABASE_URL!,
    JUDGE0_URL: process.env.JUDGE0_URL!,
    JUDGE0_AUTHN_TOKEN: process.env.JUDGE0_AUTHN_TOKEN ?? "",
    JUDGE0_RAPIDAPI_KEY: process.env.JUDGE0_RAPIDAPI_KEY ?? "",
    JUDGE0_RAPIDAPI_HOST: process.env.JUDGE0_RAPIDAPI_HOST ?? "",
    AUTH_SECRET: process.env.AUTH_SECRET!,
  };
  return cached;
}

/** Headers for any Judge0 request (works for self-hosted OR RapidAPI). */
export function judge0Headers(): Record<string, string> {
  const env = getServerEnv();
  const h: Record<string, string> = {};
  if (env.JUDGE0_RAPIDAPI_KEY) {
    h["X-RapidAPI-Key"] = env.JUDGE0_RAPIDAPI_KEY;
    h["X-RapidAPI-Host"] =
      env.JUDGE0_RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";
  } else if (env.JUDGE0_AUTHN_TOKEN) {
    h["X-Auth-Token"] = env.JUDGE0_AUTHN_TOKEN;
  }
  return h;
}
