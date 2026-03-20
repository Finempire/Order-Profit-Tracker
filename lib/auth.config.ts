import type { NextAuthConfig } from "next-auth";

/**
 * Lightweight auth config used by the Edge-runtime middleware.
 * Must NOT import bcryptjs or any Node.js-only module.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
  providers: [], // Credentials provider (with bcrypt) is added in auth.ts
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;
