'use client';

import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function TopBar() {
  const { data: session } = useSession();

  const userInitials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors" />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col text-right select-none">
          <span className="text-sm font-semibold text-foreground leading-tight">
            {session?.user?.name || 'User'}
          </span>
          <span className="text-xs text-muted-foreground leading-tight mt-0.5">
            {session?.user?.email}
          </span>
        </div>
        <Avatar className="h-8 w-8 border border-border/80 shadow-sm shrink-0">
          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
