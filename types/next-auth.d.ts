// Augment Auth.js types with our internal user id + cognito id (feature 002).
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: number;
      cognitoId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    internalUserId?: number;
  }
}
