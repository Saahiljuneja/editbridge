import type { UserRole } from "@/types";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      role: UserRole;
      editorId: string | null;
      needsOnboarding: boolean;
      isEmailVerified: boolean;
      twoFactorPending: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    editorId?: string | null;
    twoFactorPending?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: UserRole;
    editorId: string | null;
    needsOnboarding?: boolean;
    twoFactorPending?: boolean;
  }
}
