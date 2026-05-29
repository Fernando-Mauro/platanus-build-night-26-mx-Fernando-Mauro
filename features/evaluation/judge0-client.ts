// Judge0 client (T005) — the ONLY module permitted to talk to Judge0
// (Constitution Principle III). Phase 3 (T026) extends this with batch submit
// + result polling; for the walking skeleton it only exposes a health ping.
import "server-only";
import { getServerEnv } from "@/lib/config/env";

function authHeaders(): HeadersInit {
  const { JUDGE0_AUTHN_TOKEN } = getServerEnv();
  return { "X-Auth-Token": JUDGE0_AUTHN_TOKEN };
}

export type Judge0Health = { ok: boolean; version?: string; error?: string };

/** Health check against Judge0's `/about` endpoint. Fails closed (never throws). */
export async function pingJudge0(): Promise<Judge0Health> {
  const { JUDGE0_URL } = getServerEnv();
  try {
    const res = await fetch(`${JUDGE0_URL}/about`, {
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, error: `Judge0 responded ${res.status}` };
    const body = (await res.json()) as { version?: string };
    return { ok: true, version: body.version };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unreachable" };
  }
}
