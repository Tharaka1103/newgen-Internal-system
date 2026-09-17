'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function SessionRevocationWatcher() {
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (
      status === 'unauthenticated' &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/forgot-password') &&
      !pathname.startsWith('/reset-password')
    ) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(pathname)}`;
    }
  }, [status, pathname]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={15} refetchOnWindowFocus={true}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider delay={200}>
          <SessionRevocationWatcher />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
