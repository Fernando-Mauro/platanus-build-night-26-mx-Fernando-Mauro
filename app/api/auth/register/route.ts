// Registration endpoint (T014). Creates the Cognito user (SignUp) and, when a
// verification code is supplied, confirms it (ConfirmSignUp). Credentials flow —
// no OAuth redirect, works over HTTP.
import { NextResponse } from "next/server";
import { cognitoSignUp, cognitoConfirmSignUp } from "@/features/auth/cognito";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { email, password, name, code } = body;
  if (!email) return NextResponse.json({ error: "email required" }, { status: 422 });

  // Step 2: confirm with the emailed code.
  if (code) {
    const r = await cognitoConfirmSignUp(email, code);
    return r.ok
      ? NextResponse.json({ status: "confirmed" })
      : NextResponse.json({ error: r.error }, { status: 400 });
  }

  // Step 1: create the account (Cognito emails a verification code).
  if (!password) return NextResponse.json({ error: "password required" }, { status: 422 });
  const r = await cognitoSignUp(email, password, name);
  return r.ok
    ? NextResponse.json({ status: "verification_sent" })
    : NextResponse.json({ error: r.error }, { status: 400 });
}
