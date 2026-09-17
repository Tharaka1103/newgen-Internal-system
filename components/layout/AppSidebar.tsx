'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  ClipboardList,
  Settings,
  Trophy,
  PhoneCall,
  Shield,
  Monitor,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Permission, type PermissionKey } from '@/lib/types';
import { checkPermissionInToken } from '@/lib/auth/token-permissions';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  adminOnly?: boolean;
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users, permission: Permission.USERS_VIEW },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard, permission: Permission.PAYMENTS_VIEW },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, permission: Permission.REPORTS_VIEW },
  { label: 'Leaderboard', href: '/admin/leaderboard', icon: Trophy, permission: Permission.LEADERBOARD_VIEW },
  { label: 'Audits', href: '/admin/audits', icon: Shield, permission: Permission.AUDITS_VIEW },
  { label: 'Sessions', href: '/admin/sessions', icon: Monitor, permission: Permission.SESSIONS_VIEW },
  { label: 'Settings', href: '/admin/settings', icon: Settings, permission: Permission.SETTINGS_GENERAL },
];

const agentNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/agent/dashboard', icon: LayoutDashboard },
  { label: 'Call Records', href: '/agent/call-records', icon: PhoneCall, permission: Permission.CALL_RECORDS_VIEW },
  { label: 'Leaderboard', href: '/agent/leaderboard', icon: Trophy, permission: Permission.LEADERBOARD_VIEW },
  { label: 'Settings', href: '/agent/settings', icon: Settings },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isAdmin = session?.user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : agentNavItems;
  const userInitials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const filteredNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return checkPermissionInToken(
      (session?.user as any)?.permissions,
      (session?.user as any)?.role,
      item.permission as PermissionKey
    );
  });

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1">
          <Link href={isAdmin ? '/admin/dashboard' : '/agent/dashboard'} className="flex items-center gap-2.5 flex-1 min-w-0 group">
            <Image
              src="/newgen-logo.png"
              alt="Newgen School Logo"
              width={32}
              height={32}
              priority
              className="h-8 w-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">Newgen School</p>
              <p className="text-[10px] text-muted-foreground truncate">Internal System</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isAdmin ? 'Administration' : 'Agent Portal'}
          </SidebarGroupLabel>
          <SidebarMenu>
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    render={
                      <Link href={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{session?.user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0 capitalize">
            {(session?.user as any)?.role}
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
