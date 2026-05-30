// Server-side Cognito client for the credentials flow (no OAuth redirect).
// Calls SignUp / ConfirmSignUp / InitiateAuth (USER_PASSWORD_AUTH) directly.
// Used by the Auth.js Credentials provider and the register route.
import "server-only";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  type InitiateAuthCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";

function region(): string {
  return process.env.COGNITO_REGION || process.env.AWS_REGION || "us-east-1";
}

function clientId(): string {
  const id = process.env.COGNITO_CLIENT_ID;
  if (!id) throw new Error("COGNITO_CLIENT_ID is not set");
  return id;
}

const client = () => new CognitoIdentityProviderClient({ region: region() });

/** Decode the Cognito ID token payload (sub, email, name) without verifying —
 *  it comes straight from Cognito over TLS in the same request, so it's trusted. */
export function decodeIdToken(idToken: string): {
  sub?: string;
  email?: string;
  name?: string;
} {
  try {
    const payload = idToken.split(".")[1];
    const json = Buffer.from(payload, "base64").toString("utf8");
    const claims = JSON.parse(json) as Record<string, unknown>;
    return {
      sub: claims.sub as string | undefined,
      email: claims.email as string | undefined,
      name: (claims.name as string | undefined) ?? (claims.email as string | undefined),
    };
  } catch {
    return {};
  }
}

/** Sign in with email+password via USER_PASSWORD_AUTH. Returns the ID token. */
export async function cognitoSignIn(
  email: string,
  password: string
): Promise<{ idToken: string } | null> {
  let res: InitiateAuthCommandOutput;
  try {
    res = await client().send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId(),
        AuthParameters: { USERNAME: email, PASSWORD: password },
      })
    );
  } catch {
    return null; // invalid credentials / unconfirmed user
  }
  const idToken = res.AuthenticationResult?.IdToken;
  return idToken ? { idToken } : null;
}

/** Register a new user. Cognito emails a verification code (autoVerify). */
export async function cognitoSignUp(
  email: string,
  password: string,
  name?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await client().send(
      new SignUpCommand({
        ClientId: clientId(),
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          ...(name ? [{ Name: "name", Value: name }] : []),
        ],
      })
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "sign-up failed" };
  }
}

/** Confirm a sign-up with the emailed code. */
export async function cognitoConfirmSignUp(
  email: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await client().send(
      new ConfirmSignUpCommand({
        ClientId: clientId(),
        Username: email,
        ConfirmationCode: code,
      })
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "confirm failed" };
  }
}
