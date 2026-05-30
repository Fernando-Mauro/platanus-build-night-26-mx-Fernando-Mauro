// Auth.js (NextAuth v5) — local Credentials provider backed by our own users
// table (email + scrypt password hash). Off-AWS: no Cognito. On sign-in we
// resolve the internal user id and stash it on the session; cold-start mastery
// is created at registration time.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateUser } from "@/lib/db/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the request host (Vercel sets it; also needed on localhost) so the
  // session cookie is set after sign-in.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = (creds?.email as string | undefined)?.toLowerCase().trim();
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;
        const user = await authenticateUser(email, password);
        if (!user) return null;
        return { id: String(user.id), email: user.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, user }) {
      // `user.id` is our internal id (set in authorize on initial sign-in).
      if (user?.id) token.internalUserId = Number(user.id);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.internalId = (token as { internalUserId?: number }).internalUserId;
      }
      return session;
    },
  },
});
