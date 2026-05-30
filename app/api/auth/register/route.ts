// User registration (local auth). POST { email, password } → create the user
// with a hashed password + cold-start mastery (50% per competency). No email
// verification step (off-AWS demo).
import { NextResponse } from "next/server";
import { registerUser } from "@/lib/db/users";
import { ensureColdStartMastery } from "@/lib/db/knowledge";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = (body?.email as string | undefined)?.toLowerCase().trim();
  const password = body?.password as string | undefined;
  if (!email || !password) {
    return NextResponse.json({ error: "Correo y contraseña son obligatorios." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
  }
  try {
    const user = await registerUser({ email, password });
    try {
      await ensureColdStartMastery(user.id);
    } catch (err) {
      console.error("ensureColdStartMastery failed (non-fatal):", err);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No se pudo registrar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
