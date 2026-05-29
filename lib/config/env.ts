// Server-only environment loader/validator (T003).
// Reads required runtime config and fails fast if anything is missing.
// MUST NOT be imported by client components — these values include secrets
// (Constitution Principle II: secrets never reach the client bundle).
import "server-only";

type ServerEnv = {
  DATABASE_URL: string;
  JUDGE0_URL: string;
  JUDGE0_AUTHN_TOKEN: string;
  AUTH_SECRET: string;
};

const REQUIRED: (keyof ServerEnv)[] = [
  "DATABASE_URL",
  "JUDGE0_URL",
  "JUDGE0_AUTHN_TOKEN",
  "AUTH_SECRET",
];

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Copy .env.example to .env.local (local) or check Secrets Manager wiring (AWS).`
    );
  }
  cached = {
    DATABASE_URL: process.env.DATABASE_URL!,
    JUDGE0_URL: process.env.JUDGE0_URL!,
    JUDGE0_AUTHN_TOKEN: process.env.JUDGE0_AUTHN_TOKEN!,
    AUTH_SECRET: process.env.AUTH_SECRET!,
  };
  return cached;
}
