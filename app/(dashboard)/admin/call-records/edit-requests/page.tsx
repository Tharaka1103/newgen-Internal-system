'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { formatDistanceToNow, format } from 'date-fns';
import {
  PhoneCall,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  User,
  GraduationCap,
  MessageSquare,
  AlertCircle,
  Check,
  X,
  FileCheck2,
} from 'lucide-react';
import { GRADE_OPTIONS, CALL_OUTCOMES } from '@/lib/types';

interface EditRequestItem {
  _id: string;
  agent: {
    _id: string;
    name: string;
    email: string;
  };
  callRecord: {
    _id: string;
    mobileNumber: string;
    grade: string;
    month: string;
    outcome: string;
    notes?: string;
    createdAt: string;
  };
  student?: {
    name: string;
    grade: string;
    medium?: string;
    registrationDate: string;
    status: string;
  } | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminNote?: string;
  reviewedBy?: {
    _id: string;
    name: string;
  };
  reviewedAt?: string;
  createdAt: string;
}

function AdminEditRequestsContent() {
  const [requests, setRequests] = useState<EditRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Dialog action state
  const [selectedRequest, setSelectedRequest] = useState<EditRequestItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/call-records/requests?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data.items || []);
        setTotalPages(data.data.totalPages || 1);
        setTotalCount(data.data.total || 0);
        setPendingCount(data.data.pendingCount || 0);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchRequests, 250);
    return () => clearTimeout(t);
  }, [fetchRequests]);

  const handleOpenAction = (req: EditRequestItem, type: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setActionType(type);
    setAdminNote('');
    setActionError(null);
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/call-records/requests/${selectedRequest._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          adminNote: adminNote.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedRequest(null);
        setActionType(null);
        fetchRequests();
      } else {
        setActionError(data.error || 'Failed to process request.');
      }
    } catch {
      setActionError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-amber-600 bg-amber-500/10 border-amber-500/20 capitalize gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 capitalize gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="text-blue-600 bg-blue-500/10 border-blue-500/20 capitalize gap-1">
            <FileCheck2 className="h-3 w-3" />
            Edited
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="text-destructive bg-destructive/10 border-destructive/20 capitalize gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call Record Edit Requests"
        description="Review agent justification notes and grant permission to edit logged call records"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Pending Requests</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
              {pendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Total Filtered</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-primary" />
              {totalCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Current View</CardDescription>
            <CardTitle className="text-lg font-semibold capitalize text-muted-foreground mt-1">
              {statusFilter === 'all' ? 'All Requests' : `${statusFilter} Only`}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-5 h-9 text-xs">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="completed">Edited</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by agent, phone, or reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg w-full" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center">
          <PhoneCall className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-medium">No edit requests found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or status filter.'
              : 'Agents have not submitted any edit requests yet.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Agent</TableHead>
                <TableHead className="font-semibold">Call Record</TableHead>
                <TableHead className="font-semibold">Registered Student</TableHead>
                <TableHead className="font-semibold">Edit Reason Note</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => {
                const record = req.callRecord;
                const student = req.student;
                return (
                  <TableRow key={req._id} className="hover:bg-muted/20">
                    {/* Agent details */}
                    <TableCell className="font-medium align-top py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {req.agent?.name ? req.agent.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-xs text-foreground">{req.agent?.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{req.agent?.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Call Record Details */}
                    <TableCell className="align-top py-3">
                      {record ? (
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-medium">{record.mobileNumber}</span>
                            <Badge variant="outline" className="text-[10px] py-0">
                              {GRADE_OPTIONS.find((g) => g.value === record.grade)?.label || record.grade}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Month:{' '}
                            {record.month
                              ? new Date(record.month).toLocaleDateString('en', { month: 'short', year: 'numeric' })
                              : '—'}{' '}
                            | Outcome: <span className="capitalize font-medium">{record.outcome?.replace(/_/g, ' ')}</span>
                          </p>
                          {record.notes && (
                            <p className="text-[11px] text-muted-foreground/80 italic max-w-xs truncate">
                              "{record.notes}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Record removed</span>
                      )}
                    </TableCell>

                    {/* Associated Student Details */}
                    <TableCell className="align-top py-3">
                      {student ? (
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate max-w-[140px]">{student.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-[10px] capitalize py-0">
                              {student.medium ?? 'sinhala'} medium
                            </Badge>
                            <Badge
                              variant={student.status === 'active' ? 'outline' : 'destructive'}
                              className="text-[10px] py-0"
                            >
                              {student.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Reg:{' '}
                            {student.registrationDate
                              ? format(new Date(student.registrationDate), 'dd MMM yyyy')
                              : '—'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not registered yet</span>
                      )}
                    </TableCell>

                    {/* Agent Reason Note */}
                    <TableCell className="align-top py-3 max-w-xs">
                      <div className="rounded bg-muted/40 p-2 border text-xs">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>Submitted {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-foreground text-xs whitespace-pre-wrap">{req.reason}</p>
                      </div>
                      {req.adminNote && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          <span className="font-semibold">Admin note:</span> {req.adminNote}
                        </p>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="align-top py-3">
                      <div className="space-y-1">
                        {getStatusBadge(req.status)}
                        {req.reviewedBy && (
                          <p className="text-[10px] text-muted-foreground">
                            by {req.reviewedBy.name}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right align-top py-3 pr-4">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            onClick={() => handleOpenAction(req, 'approve')}
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleOpenAction(req, 'reject')}
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="border-t bg-muted/10 px-4">
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={20}
              onPageChange={setPage}
              itemName="requests"
            />
          </div>
        </div>
      )}

      {/* Approve / Reject Dialog */}
      <Dialog open={Boolean(selectedRequest && actionType)} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Approve Edit Request
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Reject Edit Request
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Grant permission to agent ${selectedRequest?.agent?.name} to edit call record ${selectedRequest?.callRecord?.mobileNumber}.`
                : `Reject the edit request from agent ${selectedRequest?.agent?.name}.`}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">Agent's Justification Note:</p>
              <p className="italic text-muted-foreground">"{selectedRequest?.reason}"</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="action-admin-note">
                Admin Note {actionType === 'reject' ? '(Optional explanation)' : '(Optional)'}
              </Label>
              <Textarea
                id="action-admin-note"
                placeholder={
                  actionType === 'approve'
                    ? 'e.g. Approved. Please update the grade promptly.'
                    : 'e.g. Call record already matches verified payment.'
                }
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedRequest(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={isSubmitting}
              className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive'}
            >
              {isSubmitting
                ? 'Processing...'
                : actionType === 'approve'
                ? 'Confirm Approval'
                : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminCallRecordEditRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AdminEditRequestsContent />
    </Suspense>
  );
}
