'use client';

import { Suspense } from 'react';
import { NotificationsView } from '@/components/notifications/NotificationsView';
import { Skeleton } from '@/components/ui/skeleton';

export default function AgentNotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      }
    >
      <NotificationsView role="agent" />
    </Suspense>
  );
}
