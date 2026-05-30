// Shared shape for our authenticated user. The Auth.js session callback attaches
// `internalId` (our users.id) onto session.user; consumers read it via this type.
export type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  internalId?: number;
};
