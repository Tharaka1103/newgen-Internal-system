import { auth } from './auth';
import { hasPermission } from '@/lib/services/permission.service';
import type { PermissionKey } from '@/lib/types';

/**
 * Get the current session on the server. Throws if not authenticated.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user || !session.user.id) {
    throw new Error('Unauthorized: You must be logged in.');
  }
  return session as typeof session & {
    user: NonNullable<typeof session['user']> & {
      id: string;
      role: 'admin' | 'agent';
      permissions: string[];
    };
  };
}

/**
 * Require a specific role. Throws if not authorized.
 */
export async function requireRole(role: 'admin' | 'agent') {
  const session = await requireAuth();
  if (session.user.role !== role && session.user.role !== 'admin') {
    throw new Error(`Forbidden: This action requires the '${role}' role.`);
  }
  return session;
}

/**
 * Require admin role specifically.
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'admin') {
    throw new Error('Forbidden: This action requires admin privileges.');
  }
  return session;
}

/**
 * Require a specific permission. Checks DB (for freshest data). Throws if not authorized.
 */
export async function requirePermission(permission: PermissionKey) {
  const session = await requireAuth();
  const allowed = await hasPermission(session.user.id, permission);
  if (!allowed) {
    throw new Error(`Forbidden: You don't have the '${permission}' permission.`);
  }
  return session;
}

export { checkPermissionInToken } from './token-permissions';
