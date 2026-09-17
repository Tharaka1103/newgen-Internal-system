import { type DefaultSession } from 'next-auth';
import type { PermissionKey, UserRole } from '@/lib/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      permissions: string[];
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    role?: UserRole;
    permissions?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    permissions?: string[];
  }
}
