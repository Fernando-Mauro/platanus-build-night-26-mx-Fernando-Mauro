// Shared shape for our authenticated user (feature 002). The Auth.js session
// callback attaches `internalId` (our RDS users.id) and `cognitoId` onto
// session.user; consumers read it through this helper type.
export type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  internalId?: number;
  cognitoId?: string;
};
