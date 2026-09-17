import type { PermissionKey } from '@/lib/types';

/**
 * Check permission from token (fast, client-safe, no DB call).
 * Used by UI components for gating navigation and buttons.
 */
export function checkPermissionInToken(
  permissions: string[] | undefined,
  role: string | undefined,
  permission: PermissionKey
): boolean {
  if (role === 'admin') return true;
  return permissions?.includes(permission) ?? false;
}
