// Judge0 client — the ONLY module (besides evaluate.ts) permitted to talk to
// Judge0 (Constitution Principle III). Works against self-hosted Judge0 or
// Judge0 CE on RapidAPI (header set chosen in lib/config/env).
import "server-only";
import { getServerEnv, judge0Headers } from "@/lib/config/env";

export type Judge0Health = { ok: boolean; version?: string; error?: string };

/** Health check against Judge0's `/about` endpoint. Fails closed (never throws). */
export async function pingJudge0(): Promise<Judge0Health> {
  const { JUDGE0_URL } = getServerEnv();
  try {
    const res = await fetch(`${JUDGE0_URL.replace(/\/$/, "")}/about`, {
      headers: judge0Headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, error: `Judge0 responded ${res.status}` };
    const body = (await res.json()) as { version?: string };
    return { ok: true, version: body.version };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unreachable" };
  }
}
