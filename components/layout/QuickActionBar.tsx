'use client';

import { usePathname } from 'next/navigation';
import { Plus, FileText, PhoneCall, CreditCard, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
}

const PAGE_ACTIONS: Record<string, QuickAction[]> = {
  '/admin/students': [
    { label: 'Register Student', icon: Plus, href: '/admin/students?action=new-student' },
  ],
  '/admin/agents': [
    { label: 'New Agent', icon: UserPlus, href: '/admin/agents?action=new-agent' },
  ],
  '/admin/admins': [
    { label: 'New Admin', icon: UserPlus, href: '/admin/admins?action=new-admin' },
  ],
  '/admin/payments': [
    { label: 'New Payment', icon: CreditCard, href: '/admin/payments?action=new' },
  ],
  '/admin/users': [
    { label: 'New Agent', icon: UserPlus, href: '/admin/agents?action=new-agent' },
    { label: 'Register Student', icon: Plus, href: '/admin/students?action=new-student' },
  ],
  '/agent/call-records': [
    { label: 'New Call Record', icon: PhoneCall, href: '/agent/call-records?action=new' },
  ],
};

export function QuickActionBar() {
  const pathname = usePathname();

  // Find actions for current page (check exact or prefix match)
  const actions =
    PAGE_ACTIONS[pathname] ??
    Object.entries(PAGE_ACTIONS).find(([key]) => pathname.startsWith(key))?.[1] ??
    [];

  if (actions.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-6 flex items-center gap-2 z-40">
      {actions.map((action) =>
        action.href ? (
          <Button
            key={action.label}
            size="sm"
            className="shadow-lg"
            nativeButton={false}
            render={
              <Link href={action.href}>
                <action.icon className="h-3.5 w-3.5 mr-1.5" />
                {action.label}
              </Link>
            }
          />
        ) : (
          <Button key={action.label} size="sm" className="shadow-lg" onClick={action.onClick}>
            <action.icon className="h-3.5 w-3.5 mr-1.5" />
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
