import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import { User } from '@/lib/db/models';
import { LoginSchema } from '@/lib/validations/user';
import { getNumericSetting, getBooleanSetting } from '@/lib/services/settings.service';
import { SettingKey } from '@/lib/types';
import { writeAuditLog } from '@/lib/services/audit.service';
import crypto from 'crypto';
import type { IUser } from '@/lib/db/models/User';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        await connectDB();

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) return null;
        if (user.status === 'disabled') {
          throw new Error('Your account has been disabled. Please contact an administrator.');
        }

        const ip = (req?.headers as any)?.get?.('x-forwarded-for')?.split?.(',')?.[0]?.trim?.() ||
                   (req?.headers as any)?.get?.('x-real-ip') ||
                   '127.0.0.1';
        const userAgent = (req?.headers as any)?.get?.('user-agent') || 'Unknown Browser';

        // Check lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          throw new Error(`Account locked. Please try again in ${minutesLeft} minute(s).`);
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          const maxAttempts = await getNumericSetting(SettingKey.MAX_LOGIN_ATTEMPTS);
          const lockoutMinutes = await getNumericSetting(SettingKey.LOCKOUT_DURATION_MINUTES);

          user.failedLoginCount = (user.failedLoginCount || 0) + 1;

          if (user.failedLoginCount >= maxAttempts) {
            user.lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
            user.failedLoginCount = 0;
            await writeAuditLog({
              actor: user._id.toString(),
              actorName: user.name,
              action: 'user.disable',
              entityType: 'User',
              entityId: user._id.toString(),
              metadata: { reason: 'max_attempts_exceeded', lockedUntil: user.lockedUntil },
              ip,
              userAgent,
            });
          } else {
            await writeAuditLog({
              actor: user._id.toString(),
              actorName: user.name,
              action: 'auth.failed_login',
              entityType: 'User',
              entityId: user._id.toString(),
              metadata: { email: user.email, attempts: user.failedLoginCount },
              ip,
              userAgent,
            });
          }

          await user.save();
          return null;
        }

        // Successful login — reset counters & record active session
        const sessionToken = crypto.randomUUID();
        user.failedLoginCount = 0;
        user.lockedUntil = undefined;
        user.sessions = user.sessions || [];
        user.sessions.unshift({
          sessionToken,
          ip,
          userAgent,
          lastSeen: new Date(),
          createdAt: new Date(),
        });
        if (user.sessions.length > 10) {
          user.sessions = user.sessions.slice(0, 10);
        }
        await user.save();

        await writeAuditLog({
          actor: user._id.toString(),
          actorName: user.name,
          action: 'auth.login',
          entityType: 'User',
          entityId: user._id.toString(),
          metadata: { email: user.email, role: user.role },
          ip,
          userAgent,
        });

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          sessionToken,
          permissions: user.permissions ? [...user.permissions] : [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as IUser).role;
        token.sessionToken = (user as any).sessionToken;
        token.permissions = (user as unknown as IUser).permissions
          ? [...(user as unknown as IUser).permissions]
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

        // Check if session was revoked or user was disabled in database
        if (token.id && token.sessionToken) {
          try {
            await connectDB();
            const dbUser = await User.findById(token.id).select('status sessions').lean();
            const isSessionActive =
              dbUser?.status === 'active' &&
              Array.isArray(dbUser.sessions) &&
              dbUser.sessions.some((s: any) => s.sessionToken === token.sessionToken);

            if (!isSessionActive) {
              // Mark session as null so unauthorized requests are rejected
              return null as any;
            }
          } catch {
            // DB connectivity error tolerance
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours default, overridden by settings
  },
  trustHost: true,
});
