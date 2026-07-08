import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./config.edge";

// Full config (Node runtime only). Reuses the edge-safe base and layers on the
// Credentials provider, which needs bcrypt + Prisma. This module must NEVER be
// imported by the middleware — see config.edge.ts.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
});
