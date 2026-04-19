import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { Role } from "@/lib/db/schema";

type GoogleProfileWithEmailVerified = {
  email_verified?: boolean;
};

export const authOptions: NextAuthOptions = {
  debug: true,
  // NO adapter — we handle user/account upsert manually to avoid
  // transaction / driver compatibility issues.
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile?.email) return false;

      const googleProfile = profile as GoogleProfileWithEmailVerified;

      try {
        // Upsert user
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, profile.email))
          .then((r) => r[0]);

        let userId: string;

        if (existing) {
          userId = existing.id;
          // Update name/image if changed
          await db
            .update(users)
            .set({
              name: user.name ?? undefined,
              image: user.image ?? undefined,
            })
            .where(eq(users.id, userId));
        } else {
          const inserted = await db
            .insert(users)
            .values({
              email: profile.email,
              name: user.name,
              image: user.image,
              emailVerified: googleProfile.email_verified ? new Date() : null,
            })
            .returning({ id: users.id })
            .then((r) => r[0]);
          userId = inserted.id;
        }

        // Upsert the OAuth account (stores access_token, refresh_token, etc.)
        const existingAccount = await db
          .select({ provider: accounts.provider })
          .from(accounts)
          .where(
            and(
              eq(accounts.provider, account.provider),
              eq(accounts.providerAccountId, account.providerAccountId)
            )
          )
          .then((r) => r[0]);

        if (existingAccount) {
          await db
            .update(accounts)
            .set({
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state as string | undefined,
            })
            .where(
              and(
                eq(accounts.provider, account.provider),
                eq(accounts.providerAccountId, account.providerAccountId)
              )
            );
        } else {
          await db.insert(accounts).values({
            userId,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state as string | undefined,
          });
        }

        // Stash the DB user id so the jwt callback can use it
        user.id = userId;
        return true;
      } catch (err) {
        console.error("[auth] signIn callback error:", err);
        return false;
      }
    },
    async jwt({ token, user }) {
      // On initial sign-in, `user` is present with the id we set above
      if (user) {
        token.sub = user.id;
      }

      // Always hydrate role + department from DB
      if (token.sub) {
        const dbUser = await db
          .select({
            id: users.id,
            role: users.role,
            departmentId: users.departmentId,
          })
          .from(users)
          .where(eq(users.id, token.sub))
          .then((rows) => rows[0]);

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.departmentId = dbUser.departmentId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.departmentId = (token.departmentId as string) ?? undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
