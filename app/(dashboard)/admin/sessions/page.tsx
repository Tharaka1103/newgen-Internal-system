'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SessionEntry {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  sessionToken: string;
  ip?: string;
  userAgent?: string;
  lastSeen: string;
  createdAt: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.success) setSessions(data.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const revokeSession = async (userId: string, sessionToken: string) => {
    await fetch(`/api/sessions?userId=${userId}&sessionToken=${encodeURIComponent(sessionToken)}`, { method: 'DELETE' });
    fetchSessions();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Sessions"
        description="View who's logged in and revoke access if needed"
        actions={
          <Button variant="outline" size="sm" onClick={fetchSessions} id="refresh-sessions-btn">
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">No active sessions found.</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.sessionToken}>
                  <TableCell className="font-medium">{s.userName}</TableCell>
                  <TableCell>
                    <Badge variant={s.userRole === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {s.userRole}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.userEmail}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.ip ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(s.lastSeen), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Revoke session">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke Session</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will log out {s.userName} immediately. They'll need to sign in again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => revokeSession(s.userId, s.sessionToken)}>
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
