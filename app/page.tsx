import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if ((session.user as any).role === 'admin') {
    redirect('/admin/dashboard');
  }

  redirect('/agent/dashboard');
}
