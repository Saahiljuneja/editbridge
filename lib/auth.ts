import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens, editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";
import { onLoginStreak } from "@/lib/rewards";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),

  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const rawEmail = credentials.email as string;
          const rawPassword = credentials.password as string;

          // Hard length limits before hitting bcrypt or the DB.
          // bcrypt with a >72-byte input degrades silently; very long inputs
          // are a CPU-DoS vector even before the DB query runs.
          if (
            typeof rawEmail !== "string" ||
            typeof rawPassword !== "string" ||
            rawEmail.length > 254 ||
            rawPassword.length > 128 ||
            rawEmail.length < 3
          ) {
            return null;
          }

          const { comparePassword } = await import("@/lib/password");
          const email = rawEmail.toLowerCase().trim();

          console.log("[auth] Login attempt for:", email);

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            console.log("[auth] User not found for email:", email);
            return null;
          }

          if (!user.hashedPassword) {
            // Google-only account — no password set
            console.log("[auth] Google-only account (no password set) for:", email);
            return null;
          }

          const valid = await comparePassword(credentials.password as string, user.hashedPassword);
          if (!valid) {
            console.log("[auth] Password mismatch for:", email);
            return null;
          }

          // Block login for unverified email accounts (Google OAuth users are auto-verified)
          if (!user.emailVerified) {
            console.log("[auth] Email unverified for:", email);
            throw new Error("EmailNotVerified:" + user.email);
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role as UserRole,
            emailVerified: user.emailVerified,
            // Password is correct — the session issued below is left "pending" until
            // /2fa confirms a TOTP or backup code (see the jwt callback's update-trigger branch).
            twoFactorPending: user.twoFactorEnabled === true,
          };
        } catch (err) {
          // Re-throw EmailNotVerified so NextAuth can surface it as an error code
          // instead of treating it as a generic null return (wrong password).
          if (err instanceof Error && err.message.startsWith("EmailNotVerified:")) {
            throw err;
          }
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // ── Periodic role recheck (every 2 min) ─────────────────────────
      // Keeps role in sync when an admin changes it without requiring sign-out.
      const RECHECK_MS = 2 * 60 * 1000;
      if (!user && !account && trigger !== "update" && token.userId) {
        const now = Date.now();
        const lastCheck = (token.roleCheckedAt as number) ?? 0;
        if (now - lastCheck > RECHECK_MS) {
          try {
            const [fresh] = await db
              .select({ role: users.role })
              .from(users)
              .where(eq(users.id, token.userId as string))
              .limit(1);
            if (fresh) {
              token.role = fresh.role as UserRole;
              token.roleCheckedAt = now;
            }
          } catch (err) {
            console.warn("[auth] JWT role recheck database connection failed, retaining cached role:", err);
          }
        }

        // Daily login streak — fires on page load when the calendar date has changed.
        // Stored in the token so we skip the DB entirely if already counted today.
        const today = new Date().toISOString().slice(0, 10);
        if ((token.lastStreakDate as string | undefined) !== today) {
          token.lastStreakDate = today;
          onLoginStreak(token.userId as string).catch(() => {});
        }
      }

      // ── Credentials / first sign-in ──────────────────────────────────
      if (user) {
        token.userId = user.id!;
        token.role = (user.role as UserRole) ?? "client";
        token.emailVerified = !!(user as { emailVerified?: Date | null }).emailVerified;
        token.needsOnboarding = false;
        token.roleCheckedAt = Date.now();
        token.twoFactorPending = !!(user as { twoFactorPending?: boolean }).twoFactorPending;

        if (user.role === "editor") {
          const [editor] = await db
            .select({ id: editors.id })
            .from(editors)
            .where(eq(editors.userId, user.id!))
            .limit(1);
          token.editorId = editor?.id ?? null;
        } else {
          token.editorId = null;
        }

        token.lastStreakDate = new Date().toISOString().slice(0, 10);
        onLoginStreak(user.id!).catch(() => {});
      }

      // ── Google OAuth sign-in ─────────────────────────────────────────
      if (account?.provider === "google" && token.userId) {
        const userId = token.userId as string;
        // OAuth is its own strong second factor — app-level 2FA never gates it.
        token.twoFactorPending = false;

        // Read intended role from the cookie set before the OAuth redirect
        let intendedRole: UserRole = "client";
        try {
          const cookieStore = await cookies();
          const pending = cookieStore.get("pending_google_role")?.value;
          if (pending === "editor") intendedRole = "editor";
          // Clear the cookie
          cookieStore.delete("pending_google_role");
        } catch {
          // cookies() unavailable in this context — use DB value
        }

        // Read current DB state for this user
        const [existing] = await db
          .select({ role: users.role, onboarded: users.onboarded, emailVerified: users.emailVerified })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (existing) {
          if (!existing.onboarded) {
            // New user — set role from the intended role cookie
            await db
              .update(users)
              .set({ role: intendedRole, onboarded: true, updatedAt: new Date() })
              .where(eq(users.id, userId));

            token.role = intendedRole;
            token.needsOnboarding = false;

            // Create editor row if needed
            if (intendedRole === "editor") {
              const [ed] = await db
                .select({ id: editors.id })
                .from(editors)
                .where(eq(editors.userId, userId))
                .limit(1);
              if (!ed) {
                const [newEd] = await db
                  .insert(editors)
                  .values({ userId })
                  .returning({ id: editors.id });
                token.editorId = newEd?.id ?? null;
              } else {
                token.editorId = ed.id;
              }
            } else {
              token.editorId = null;
            }
          } else {
            // Returning user — use stored role
            token.role = (existing.role as UserRole) ?? "client";
            token.needsOnboarding = false;

            if (existing.role === "editor") {
              const [ed] = await db
                .select({ id: editors.id })
                .from(editors)
                .where(eq(editors.userId, userId))
                .limit(1);
              token.editorId = ed?.id ?? null;
            } else {
              token.editorId = null;
            }
          }

          token.emailVerified = !!existing.emailVerified;
        }

        token.lastStreakDate = new Date().toISOString().slice(0, 10);
        onLoginStreak(userId).catch(() => {});
      }

      // ── Manual session update() ──────────────────────────────────────
      if (trigger === "update" && token.userId) {
        try {
          const [fresh] = await db
            .select({ role: users.role, onboarded: users.onboarded, emailVerified: users.emailVerified, twoFactorVerifiedAt: users.twoFactorVerifiedAt, name: users.name, image: users.image })
            .from(users)
            .where(eq(users.id, token.userId as string))
            .limit(1);

          if (fresh) {
            token.name = fresh.name ?? token.name;
            token.picture = fresh.image ?? token.picture;
            token.role = (fresh.role as UserRole) ?? "client";
            token.needsOnboarding = false;
            token.emailVerified = !!fresh.emailVerified;

            if (fresh.role === "editor") {
              const [editor] = await db
                .select({ id: editors.id })
                .from(editors)
                .where(eq(editors.userId, token.userId as string))
                .limit(1);
              token.editorId = editor?.id ?? null;
            } else {
              token.editorId = null;
            }

            // Clear the pending-2FA gate only on a server-verified marker written by
            // /api/auth/2fa/authenticate — never trust the client-supplied update() payload
            // itself for this. The marker is single-use: consume it immediately.
            if (token.twoFactorPending && fresh.twoFactorVerifiedAt) {
              const ageMs = Date.now() - fresh.twoFactorVerifiedAt.getTime();
              if (ageMs >= 0 && ageMs < 2 * 60 * 1000) {
                token.twoFactorPending = false;
                await db.update(users).set({ twoFactorVerifiedAt: null }).where(eq(users.id, token.userId as string));
              }
            }
          }
        } catch (err) {
          console.warn("[auth] JWT session update database connection failed, skipping update:", err);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.userId = token.userId as string;
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.image = (token.picture as string | null) ?? session.user.image;
        session.user.role = (token.role as UserRole) ?? "client";
        session.user.editorId = (token.editorId as string | null) ?? null;
        session.user.needsOnboarding = (token.needsOnboarding as boolean) ?? false;
        // emailVerified on DefaultSession["user"] is Date|null — use our custom boolean field name
        (session.user as { isEmailVerified?: boolean }).isEmailVerified = (token.emailVerified as boolean) ?? false;
        session.user.twoFactorPending = (token.twoFactorPending as boolean) ?? false;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
