// Augment the Auth.js JWT with our fields (feature 002). We deliberately do NOT
// augment Session.user (v5 merging collides with the default id:string); session
// consumers read extra fields via the SessionUser helper type.
import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    internalUserId?: number;
    cognitoSub?: string;
  }
}
