'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  Trophy,
  PhoneCall,
  Shield,
  Monitor,
  LogOut,
  GraduationCap,
  Headphones,
  ShieldCheck,
  Sparkles,
  Wallet,
  Bell,
  FileEdit,
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Permission, type PermissionKey } from '@/lib/types';
import { checkPermissionInToken } from '@/lib/auth/token-permissions';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  tooltip: string;
}

const adminNavItems: NavItem[] = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard, tooltip: 'System overview and key metrics' },
  { label: 'Students', href: '/admin/students', icon: GraduationCap, permission: Permission.STUDENTS_VIEW, tooltip: 'Manage students & record payments' },
  { label: 'Agents', href: '/admin/agents', icon: Headphones, permission: Permission.USERS_VIEW, tooltip: 'Manage agents & permissions' },
  { label: 'Edit Requests', href: '/admin/call-records/edit-requests', icon: FileEdit, permission: Permission.CALL_RECORDS_VIEW, tooltip: 'Review call record edit requests' },
  { label: 'Loyalty Claims', href: '/admin/claims', icon: Wallet, permission: Permission.CLAIMS_VIEW, tooltip: 'Process agent cash claims & payouts' },
  { label: 'Leaderboard', href: '/admin/leaderboard', icon: Trophy, permission: Permission.LEADERBOARD_VIEW, tooltip: 'Agent rankings' },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, permission: Permission.REPORTS_VIEW, tooltip: 'Analytics and exports' },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell, permission: Permission.NOTIFICATIONS_VIEW, tooltip: 'System alerts & messages' },
  { label: 'Administrators', href: '/admin/admins', icon: ShieldCheck, permission: Permission.USERS_VIEW, tooltip: 'System administrators' },
  { label: 'Activity Log', href: '/admin/audits', icon: Shield, permission: Permission.AUDITS_VIEW, tooltip: 'System action history' },
  { label: 'Sessions', href: '/admin/sessions', icon: Monitor, permission: Permission.SESSIONS_VIEW, tooltip: 'Active login sessions' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, permission: Permission.SETTINGS_GENERAL, tooltip: 'System configuration' },
];

const agentNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/agent/dashboard', icon: LayoutDashboard, tooltip: 'Your performance snapshot' },
  { label: 'Call Records', href: '/agent/call-records', icon: PhoneCall, permission: Permission.CALL_RECORDS_VIEW, tooltip: 'Log and review calls' },
  { label: 'Loyalty Claims', href: '/agent/claims', icon: Wallet, permission: Permission.CLAIMS_SUBMIT, tooltip: 'Claim loyalty cash rewards' },
  { label: 'Leaderboard', href: '/agent/leaderboard', icon: Trophy, permission: Permission.LEADERBOARD_VIEW, tooltip: 'See how you rank' },
  { label: 'Notifications', href: '/agent/notifications', icon: Bell, permission: Permission.NOTIFICATIONS_VIEW, tooltip: 'Your alerts & attributions' },
  { label: 'Settings', href: '/agent/settings', icon: Settings, tooltip: 'Your preferences' },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
    <>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
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
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <SidebarMenuButton
                            isActive={isActive}
                            render={
                              <Link href={item.href} className="flex items-center gap-2">
                                <item.icon className="h-4 w-4 shrink-0" />
                                <span>{item.label}</span>
                              </Link>
                            }
                          />
                        }
                      />
                      <TooltipContent side="right" className="text-xs">
                        {item.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <div className="space-y-3 px-2 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{session?.user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{session?.user?.email}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                {(session?.user as any)?.role}
              </Badge>
            </div>

            <Separator className="opacity-50" />

            <div className="flex items-center justify-between">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoutConfirm(true)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1.5"
                aria-label="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-sm p-6" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Confirm Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out? You will need to enter your credentials to log in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 mt-4 flex-row justify-end">
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowLogoutConfirm(false);
                signOut({ callbackUrl: '/login' });
              }}
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
