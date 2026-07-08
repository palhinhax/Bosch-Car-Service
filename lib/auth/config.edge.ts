import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration. This is the ONLY auth config the middleware
 * imports, so it must never pull in Node-only code (bcryptjs, Prisma, etc.).
 * The Credentials provider — which needs bcrypt + Prisma to verify passwords —
 * lives in `config.ts`, which only runs in the Node runtime (API route).
 *
 * The jwt/session callbacks are pure token shuffling (no I/O), so they are safe
 * to share with the Edge middleware.
 */
export const authConfig = {
  // Infer the host from the incoming request instead of relying on a fixed
  // NEXTAUTH_URL — works across ports and behind reverse proxies.
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  // Real providers are added in config.ts (Node runtime only).
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.employeeId = user.employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "EMPLOYEE";
        session.user.employeeId = (token.employeeId as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
