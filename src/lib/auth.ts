import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, dbPool } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Role } from "@/lib/db/schema";

export const authOptions: NextAuthOptions = {
  debug: true,
  adapter: DrizzleAdapter(dbPool, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request Drive scope for the Picker API OAuth token
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      // Hydrate role + department into every session
      const dbUser = await db
        .select({
          id: users.id,
          role: users.role,
          departmentId: users.departmentId,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .then((rows) => rows[0]);

      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.role = dbUser.role as Role;
        session.user.departmentId = dbUser.departmentId ?? undefined;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
