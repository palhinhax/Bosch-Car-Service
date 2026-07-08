import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Infer the host from the incoming request instead of relying on a fixed
  // NEXTAUTH_URL — works across ports and behind reverse proxies.
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Employees ARE the users — authenticate against the Employee table.
        const employee = await prisma.employee.findUnique({
          where: { email },
        });

        if (!employee || !employee.passwordHash || !employee.active) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          password,
          employee.passwordHash
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: employee.id,
          email: employee.email,
          name: employee.name,
          role: employee.role,
          employeeId: employee.id,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
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
});
