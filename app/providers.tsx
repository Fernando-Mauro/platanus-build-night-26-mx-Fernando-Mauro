"use client";

import { SessionProvider } from "next-auth/react";

// Client session context for the SPA (T012/T014). Wraps the app so client
// components can read the Auth.js session via useSession().
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
