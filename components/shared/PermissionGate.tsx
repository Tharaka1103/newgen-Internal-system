'use client';

import { useSession } from 'next-auth/react';
import { checkPermissionInToken } from '@/lib/auth/token-permissions';
import type { PermissionKey } from '@/lib/types';

interface PermissionGateProps {
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** If true, renders children as disabled instead of hiding */
  disable?: boolean;
}

/**
 * Client-side permission gate.
 * Reads permissions from session token (no DB call).
 * Use for UI hiding/disabling only — always pair with server-side checks on actions.
 */
export function PermissionGate({ permission, children, fallback = null, disable = false }: PermissionGateProps) {
  const { data: session } = useSession();
  const allowed = checkPermissionInToken(
    (session?.user as any)?.permissions,
    (session?.user as any)?.role,
    permission
  );

  if (!allowed) {
    if (disable) {
      return (
        <div className="opacity-50 pointer-events-none select-none" aria-disabled="true">
          {children}
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
