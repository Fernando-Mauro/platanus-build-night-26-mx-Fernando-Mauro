// Auth.js (NextAuth v5) configuration with the Cognito provider (T010).
// Server-side JWT cookie session. On sign-in, JIT-sync the user into RDS and
// attach the internal user id to the token/session. (contracts/auth.md)
import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";
import { jitSync } from "./jit-sync";

// Read directly from process.env (not the throwing validator) so `next build`
// route collection doesn't fail when Cognito env is absent at build time. At
// runtime on Fargate these are injected from the Auth stack / Secrets Manager.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID,
      clientSecret: process.env.COGNITO_CLIENT_SECRET,
      issuer: process.env.COGNITO_ISSUER,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // On first sign-in, upsert the RDS user row and stash the internal id.
    async jwt({ token, profile }) {
      if (profile && token.sub) {
        try {
          const user = await jitSync({
            cognitoId: token.sub,
            email: (profile.email as string) ?? (token.email as string) ?? "",
            name: (profile.name as string) ?? null,
          });
          token.internalUserId = user.id;
        } catch (err) {
          // Do not block login on a transient DB hiccup; next login self-heals.
          console.error("jitSync failed:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.internalUserId as number | undefined;
        session.user.cognitoId = token.sub;
      }
      return session;
    },
  },
});
