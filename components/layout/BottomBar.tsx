'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function BottomBar() {
  const { data: session } = useSession();
  const { state, isMobile } = useSidebar();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isAdmin = session?.user?.role === 'admin';
  const homeHref = isAdmin ? '/admin/dashboard' : '/agent/dashboard';

  return (
    <aside
      aria-label="Bottom Navigation Bar"
      className={cn(
        'fixed bottom-4 z-40 right-4 md:right-6 transition-[left] duration-200 ease-linear pointer-events-none',
        isMobile
          ? 'left-4'
          : state === 'collapsed'
            ? 'left-4 md:left-[4.5rem]'
            : 'left-4 md:left-[17.5rem]'
      )}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-2 py-2 bg-background/85 backdrop-blur-xl border border-border/80 shadow-2xl rounded-full text-foreground pointer-events-auto">
        {/* 1. Left Corner: Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={homeHref}
            className="flex items-center gap-2 group hover:opacity-90 transition-opacity"
            aria-label="Newgen Home"
          >
            <Image
              src="/newgen-logo.png"
              alt="Newgen Logo"
              width={40}
              height={40}
              priority
              className="h-10 w-10 scale-130 object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-heading font-bold text-xs tracking-tight text-foreground">Newgen</span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">Online School</span>
            </div>
          </Link>

          <div className="h-4 w-px bg-border/60 mx-0.5" />

        </div>

        {/* 3. Search Bar */}
        <div className="flex-1 max-w-sm mx-2 flex justify-center">
          <GlobalSearch />
        </div>

        {/* 4. Bell Icon & 5. Logout Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <NotificationBell />
          <div className="h-4 w-px bg-border/60 mx-1" />

          <ThemeToggle />
          <div className="h-4 w-px bg-border/60 mx-1" />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors gap-1.5 font-medium rounded-xl"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              }
            />
            <TooltipContent>Sign out of your account</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-sm p-6" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Confirm Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out of your account? You will need to enter your credentials to log in again.
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
    </aside>
  );
}
