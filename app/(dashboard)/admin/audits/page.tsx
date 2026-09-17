'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

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
    <div className="space-y-6">
      <PageHeader title="Activity Log" description="Complete history of all system actions" />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={actionFilter} onValueChange={(val) => setActionFilter(val ?? '')}>
          <SelectTrigger className="h-9 text-sm w-44" id="audit-action-filter">
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
          <SelectTrigger className="h-9 text-sm w-36" id="audit-entity-filter">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All entities</SelectItem>
            {['User', 'Student', 'CallRecord', 'PaymentRecord', 'ClaimRequest', 'Setting', 'Session', 'MonthlyTarget'].map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm w-36" id="audit-date-from" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm w-36" id="audit-date-to" placeholder="To" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">No activity logs found.</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="text-right">Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell>
                    <Badge variant={getActionVariant(log.action)} className="text-xs">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{log.actorName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{log.entityType}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{log.ip ?? '—'}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    <div>{format(new Date(log.createdAt), 'dd MMM yyyy')}</div>
                    <div className="text-xs">{format(new Date(log.createdAt), 'HH:mm:ss')}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              ← Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
