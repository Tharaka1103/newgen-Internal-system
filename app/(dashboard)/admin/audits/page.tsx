'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';

interface AuditLogEntry {
  _id: string;
  actor: { name: string; email: string; role: string } | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  'user.create': 'User Created',
  'user.update': 'User Updated',
  'user.disable': 'User Disabled',
  'user.enable': 'User Enabled',
  'user.permission.grant': 'Permission Granted',
  'user.permission.revoke': 'Permission Revoked',
  'student.create': 'Student Registered',
  'student.update': 'Student Updated',
  'call_record.create': 'Call Record Created',
  'call_record.admin_correct': 'Call Record Corrected',
  'payment.create': 'Payment Created',
  'claim.submit': 'Claim Submitted',
  'claim.approve': 'Claim Approved',
  'claim.reject': 'Claim Rejected',
  'setting.update': 'Settings Updated',
  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'auth.failed_login': 'Failed Login',
  'auth.forgot_password': 'Password Reset Requested',
  'auth.reset_password': 'Password Reset',
  'session.revoke': 'Session Revoked',
  'target.set': 'Target Set',
};

function getActionVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('create') || action.includes('enable') || action.includes('approve')) return 'default';
  if (action.includes('disable') || action.includes('reject') || action.includes('failed')) return 'destructive';
  if (action.includes('correct') || action.includes('update') || action.includes('revoke')) return 'secondary';
  return 'outline';
}

export default function AuditsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 30;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (actionFilter) params.set('action', actionFilter);
    if (entityTypeFilter) params.set('entityType', entityTypeFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    try {
      const res = await fetch(`/api/audits?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.items);
        setTotal(data.data.total);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, entityTypeFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <PageHeader title="Audit Logs" description="Complete history of all system actions" />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={actionFilter} onValueChange={(val) => setActionFilter(val ?? '')}>
          <SelectTrigger className="h-8 text-sm w-44" id="audit-action-filter">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityTypeFilter} onValueChange={(val) => setEntityTypeFilter(val ?? '')}>
          <SelectTrigger className="h-8 text-sm w-36" id="audit-entity-filter">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All entities</SelectItem>
            {['User', 'Student', 'CallRecord', 'PaymentRecord', 'ClaimRequest', 'Setting', 'Session', 'MonthlyTarget'].map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-sm w-36" id="audit-date-from" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-sm w-36" id="audit-date-to" placeholder="To" />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          [...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
        ) : (
          <>
            {logs.map((log) => (
              <Card key={log._id}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionVariant(log.action)} className="text-xs">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                      <span className="text-sm font-medium">{log.actorName}</span>
                      <Badge variant="outline" className="text-xs">{log.entityType}</Badge>
                    </div>
                    {(log.before || log.after) && (
                      <div className="mt-1.5 text-xs font-mono text-muted-foreground truncate max-w-xl">
                        {log.after ? JSON.stringify(log.after).slice(0, 100) : ''}
                      </div>
                    )}
                    {log.ip && (
                      <p className="text-xs text-muted-foreground mt-0.5">IP: {log.ip}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 text-right">
                    <p>{format(new Date(log.createdAt), 'dd MMM yyyy')}</p>
                    <p>{format(new Date(log.createdAt), 'HH:mm:ss')}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">No audit logs found.</div>
            )}
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
