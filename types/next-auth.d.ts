// Augment only the JWT with our internal RDS user id (feature 002).
// We deliberately do NOT augment Session.user (next-auth v5 interface merging is
// fragile and collides with the default `id: string`). Session consumers read our
// extra fields via the SessionUser helper type in features/auth/types.ts.
import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    internalUserId?: number;
  }
}
