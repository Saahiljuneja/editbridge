import type { NextAuthConfig } from "next-auth";

// Edge-safe config used only by middleware (no providers, no db imports, no crypto)
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.role = token.role as any;
        session.user.needsOnboarding = (token.needsOnboarding as boolean) ?? false;
      }
      return session;
    },
  },
};
