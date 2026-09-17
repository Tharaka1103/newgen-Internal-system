'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Headphones, ShieldCheck, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function UsersRouterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get('action');
    const tab = searchParams.get('tab');

    if (action === 'new-student' || tab === 'students') {
      router.replace(`/admin/students${action === 'new-student' ? '?action=new-student' : ''}`);
    } else if (action === 'new-staff' || tab === 'staff') {
      router.replace(`/admin/agents${action === 'new-staff' ? '?action=new-agent' : ''}`);
    }
  }, [router, searchParams]);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="People Directory"
        description="Select a section to manage students, agents, or system administrators"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <GraduationCap className="h-5 w-5" />
            </div>
            <CardTitle>Students Directory</CardTitle>
            <CardDescription>
              Manage student profiles from Grade 2 to A/Level, call history, and payment records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/students" className="block w-full">
              <Button className="w-full">
                Manage Students
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Headphones className="h-5 w-5" />
            </div>
            <CardTitle>Agents & Telemarketers</CardTitle>
            <CardDescription>
              Manage call center agents, set targets, toggle account access, and adjust permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/agents" className="block w-full">
              <Button className="w-full">
                Manage Agents
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle>Administrators</CardTitle>
            <CardDescription>
              Manage system administrators, invite new admins, and monitor administrative security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/admins" className="block w-full">
              <Button variant="outline" className="w-full">
                Manage Admins
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <UsersRouterContent />
    </Suspense>
  );
}
