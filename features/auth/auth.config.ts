// Auth.js (NextAuth v5) — Credentials provider backed by Cognito (T010).
// We call Cognito's USER_PASSWORD_AUTH directly (no OAuth redirect), so this
// works over plain HTTP (our ALB) and on localhost. On sign-in we JIT-sync the
// user into RDS and stash the internal id on the session. (contracts/auth.md)
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cognitoSignIn, decodeIdToken } from "./cognito";
import { jitSync } from "./jit-sync";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required behind the ALB / on localhost so Auth.js trusts the request host
  // and actually sets the session cookie after sign-in.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = creds?.email as string | undefined;
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;

        const result = await cognitoSignIn(email, password);
        if (!result) return null;

        const claims = decodeIdToken(result.idToken);
        if (!claims.sub) return null;

        // Return the identity; the jwt callback handles RDS sync.
        return {
          id: claims.sub,
          email: claims.email ?? email,
          name: claims.name ?? null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, user }) {
      // `user` is set only on initial sign-in (from authorize()).
      if (user?.id) {
        token.cognitoSub = user.id;
        try {
          const synced = await jitSync({
            cognitoId: user.id,
            email: user.email ?? "",
            name: user.name ?? null,
          });
          token.internalUserId = synced.id;
        } catch (err) {
          console.error("jitSync failed:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.internalId = (token as { internalUserId?: number }).internalUserId;
        u.cognitoId = (token as { cognitoSub?: string }).cognitoSub;
      }
      return session;
    },
  },
});
