import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopBar } from '@/components/layout/TopBar';
import { QuickActionBar } from '@/components/layout/QuickActionBar';
import { BottomBar } from '@/components/layout/BottomBar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6 pb-24 relative">
          {children}
          <QuickActionBar />
          <BottomBar />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
