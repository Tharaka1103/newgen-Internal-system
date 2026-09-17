'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, X } from 'lucide-react';
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
    <div className="space-y-4">
      <PageHeader
        title="Active Sessions"
        description="View and revoke active user sessions"
        actions={
          <Button variant="outline" size="sm" onClick={fetchSessions} id="refresh-sessions-btn">
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Card key={s.sessionToken}>
              <CardContent className="p-4 flex items-start gap-4">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{s.userName}</span>
                    <Badge variant={s.userRole === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {s.userRole}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.userEmail}</p>
                  {s.ip && <p className="text-xs text-muted-foreground">IP: {s.ip}</p>}
                  {s.userAgent && (
                    <p className="text-xs text-muted-foreground truncate max-w-sm">{s.userAgent}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last seen {formatDistanceToNow(new Date(s.lastSeen), { addSuffix: true })}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Revoke session">
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
              </CardContent>
            </Card>
          ))}
          {sessions.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No active sessions found.</div>
          )}
        </div>
      )}
    </div>
  );
}
