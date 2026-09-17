import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.sessionToken = (user as any).sessionToken;
        token.permissions = Array.isArray((user as any).permissions)
          ? [...(user as any).permissions]
          : [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || '';
        session.user.role = (token.role as any) || 'agent';
        (session.user as any).sessionToken = (token.sessionToken as string) || '';
        session.user.permissions = Array.isArray(token.permissions)
          ? [...(token.permissions as string[])]
          : [];
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  trustHost: true,
  providers: [],
};
