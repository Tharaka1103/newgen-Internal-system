'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { SystemTourModal } from '@/components/shared/SystemTourModal';
import { Sparkles } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Overview',
  '/admin/students': 'Students',
  '/admin/agents': 'Agents',
  '/admin/admins': 'Administrators',
  '/admin/users': 'People',
  '/admin/payments': 'Payments',
  '/admin/reports': 'Reports',
  '/admin/leaderboard': 'Leaderboard',
  '/admin/audits': 'Activity Log',
  '/admin/sessions': 'Sessions',
  '/admin/settings': 'Settings',
  '/agent/dashboard': 'Dashboard',
  '/agent/call-records': 'Call Records',
  '/agent/leaderboard': 'Leaderboard',
  '/agent/settings': 'Settings',
};

export function TopBar() {
  const pathname = usePathname();
  const [isTourOpen, setIsTourOpen] = useState(false);
  const isAdmin = pathname.startsWith('/admin');
  const portalLabel = isAdmin ? 'Admin' : 'Agent';

  // Find the matching page title
  const pageTitle = PAGE_TITLES[pathname]
    ?? Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1]
    ?? 'Page';

  return (
    <>
      <header className="h-14 border-b border-border bg-background/95 backdrop-blur flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={isAdmin ? '/admin/dashboard' : '/agent/dashboard'}>
                  {portalLabel}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2">
          {/* System Tour Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTourOpen(true)}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors hidden sm:flex"
            title="Interactive System Guide & Walkthrough"
            id="system-tour-trigger-topbar"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>System Tour</span>
          </Button>

          <GlobalSearch />
          <NotificationBell />
        </div>
      </header>

      {/* Interactive System Tour Modal */}
      <SystemTourModal open={isTourOpen} onClose={() => setIsTourOpen(false)} />
    </>
  );
}
