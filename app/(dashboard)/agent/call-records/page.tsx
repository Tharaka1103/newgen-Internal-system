'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertCircle, AlertTriangle, Phone, Edit, KeyRound, Clock } from 'lucide-react';
import { CALL_OUTCOMES, GRADE_OPTIONS } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { cachedFetch, invalidateClientCache } from '@/lib/utils/cachedFetch';
import { normaliseSLMobile, SL_MOBILE_REGEX } from '@/lib/validations/phone';

interface CallRecord {
  _id: string;
  mobileNumber: string;
  grade: string;
  month: string;
  outcome: string;
  notes?: string;
  createdAt: string;
}

interface EditRequestItem {
  _id: string;
  callRecord: string | { _id: string };
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string;
  adminNote?: string;
}

function RequestEditDialog({
  record,
  open,
  onClose,
  onSuccess,
}: {
  record: CallRecord | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!record) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for editing this call record.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/call-records/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callRecordId: record._id, reason: reason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setReason('');
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to submit edit request.');
      }
    } catch {
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Request Edit Permission
          </DialogTitle>
          <DialogDescription>
            Call records are immutable by default. Submit a request to the administrator to unlock this record for editing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mobile:</span>
              <span className="font-mono font-medium">{record.mobileNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Grade:</span>
              <span>{GRADE_OPTIONS.find((g) => g.value === record.grade)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Month:</span>
              <span>{record.month ? new Date(record.month).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : ''}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-reason">
              Reason for edit <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-reason"
              placeholder="Explain why this call record needs modification (e.g. entered wrong grade, typo in mobile)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !reason.trim()}>
            {isLoading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgentEditRecordDialog({
  record,
  open,
  onClose,
  onSuccess,
}: {
  record: CallRecord | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [grade, setGrade] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (record) {
      setMobileNumber(record.mobileNumber);
      setGrade(record.grade);
      setOutcome(record.outcome);
      setNotes(record.notes || '');
      setError(null);
    }
  }, [record]);

  if (!record) return null;

  const handleSubmit = async () => {
    const norm = normaliseSLMobile(mobileNumber.trim());
    if (!SL_MOBILE_REGEX.test(norm)) {
      setError('Enter a valid Sri Lankan mobile number (e.g. 0711234567)');
      return;
    }
    if (!grade || !outcome) {
      setError('Grade and outcome are required.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/call-records/${record._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: norm,
          grade,
          outcome,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        invalidateClientCache('/api/call-records');
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to update record.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-emerald-600" />
            Edit Call Record
          </DialogTitle>
          <DialogDescription>
            Admin approved edit permission for this record. Update the details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* One-Time Edit Warning */}
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                One-Time Edit Warning!
              </p>
              <p className="text-[11px] text-text">
                You can only edit this record once with this permission. Please verify all details before submitting.
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-mobile">Mobile Number *</Label>
            <Input
              id="edit-mobile"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="0711234567"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-grade">Grade *</Label>
            <Select value={grade} onValueChange={(val) => setGrade(val ?? '')}>
              <SelectTrigger id="edit-grade">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-outcome">Outcome *</Label>
            <Select value={outcome} onValueChange={(val) => setOutcome(val ?? '')}>
              <SelectTrigger id="edit-outcome">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {CALL_OUTCOMES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Call notes..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// New Call Record Form
function NewCallRecordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [grade, setGrade] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleMobileBlur = () => {
    if (!mobileNumber) return;
    const normalised = normaliseSLMobile(mobileNumber.trim());
    setMobileNumber(normalised);
    if (!SL_MOBILE_REGEX.test(normalised)) {
      setMobileError('Enter a valid Sri Lankan mobile number (e.g. 0711234567)');
    } else {
      setMobileError(null);
    }
  };

  const handleSubmit = async () => {
    if (!mobileNumber || !SL_MOBILE_REGEX.test(normaliseSLMobile(mobileNumber))) {
      setMobileError('Enter a valid Sri Lankan mobile number (e.g. 0711234567)');
      return;
    }
    if (!grade || !outcome) { setError('Please fill in all required fields.'); return; }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/call-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: normaliseSLMobile(mobileNumber), grade, month, outcome, notes }),
      });
      const data = await res.json();
      if (data.success) {
        invalidateClientCache('/api/call-records');
        setSuccess(true);
        setTimeout(() => { setSuccess(false); onClose(); }, 1500);
      } else {
        setError(data.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Log Call Record</DialogTitle>
          <DialogDescription>Record a call you made to a prospective student.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4 py-2 pr-1">
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="cr-mobile">Mobile Number <span className="text-destructive">*</span></Label>
            <Input
              id="cr-mobile"
              value={mobileNumber}
              onChange={(e) => { setMobileNumber(e.target.value); setMobileError(null); }}
              onBlur={handleMobileBlur}
              placeholder="0711234567 or +94711234567"
              className={mobileError ? 'border-destructive' : ''}
            />
            {mobileError ? (
              <p className="text-[11px] text-destructive">{mobileError}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Sri Lankan mobile: 07XXXXXXXX</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-grade">Grade <span className="text-destructive">*</span></Label>
            <Select value={grade} onValueChange={(val) => setGrade(val ?? '')}>
              <SelectTrigger id="cr-grade"><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-month">Month</Label>
            <Select value={month} onValueChange={(val) => setMonth(val ?? '')}>
              <SelectTrigger id="cr-month"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={currentMonth}>This month ({currentMonth})</SelectItem>
                <SelectItem value={prevMonth}>Previous month ({prevMonth})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-outcome">Outcome <span className="text-destructive">*</span></Label>
            <Select value={outcome} onValueChange={(val) => setOutcome(val ?? '')}>
              <SelectTrigger id="cr-outcome"><SelectValue placeholder="Select outcome" /></SelectTrigger>
              <SelectContent>
                {CALL_OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-notes">Notes (optional)</Label>
            <Textarea id="cr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any additional notes..." />
          </div>
        </div>
        <DialogFooter className="gap-2 pt-3 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || success} id="submit-call-record-btn">
            {success ? '✓ Saved!' : isLoading ? 'Saving...' : 'Log Call'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Claim Dialog
function SubmitClaimDialog({ open, onClose, balance }: { open: boolean; onClose: () => void; balance: number }) {
  const [amount, setAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', bankName: '', branchName: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedAmount: parseFloat(amount), bankDetails }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => { setSuccess(false); onClose(); }, 1500);
      } else {
        setError(data.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Submit Claim Request</DialogTitle>
          <DialogDescription>Your current loyalty balance: <strong>Rs. {balance.toLocaleString()}</strong></DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="claim-amount">Amount to Claim (Rs.)</Label>
            <Input id="claim-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Minimum Rs. 5000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim-account-name">Account Holder Name</Label>
            <Input id="claim-account-name" value={bankDetails.accountName} onChange={(e) => setBankDetails((b) => ({ ...b, accountName: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim-account-number">Account Number</Label>
            <Input id="claim-account-number" value={bankDetails.accountNumber} onChange={(e) => setBankDetails((b) => ({ ...b, accountNumber: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim-bank-name">Bank Name</Label>
            <Input id="claim-bank-name" value={bankDetails.bankName} onChange={(e) => setBankDetails((b) => ({ ...b, bankName: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim-branch">Branch (optional)</Label>
            <Input id="claim-branch" value={bankDetails.branchName} onChange={(e) => setBankDetails((b) => ({ ...b, branchName: e.target.value }))} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || success} id="submit-claim-btn">
            {success ? '✓ Submitted!' : isLoading ? 'Submitting...' : 'Submit Claim'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const OUTCOME_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  interested: 'default',
  not_interested: 'destructive',
  call_back_later: 'secondary',
  no_answer: 'outline',
};

function CallRecordsContent() {
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [editRequestsMap, setEditRequestsMap] = useState<Record<string, EditRequestItem>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [requestingRecord, setRequestingRecord] = useState<CallRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<CallRecord | null>(null);
  const [balance, setBalance] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowNewRecord(true);
    }
  }, [searchParams]);

  const handleCloseNewRecord = () => {
    setShowNewRecord(false);
    if (searchParams.get('action') === 'new') {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('action');
      const q = p.toString();
      window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);
    }
  };

  const fetchRecords = useCallback(async () => {
    try {
      const [recordsRes, claimsRes, reqsRes] = await Promise.all([
        cachedFetch(`/api/call-records?page=${page}&limit=20`),
        cachedFetch('/api/claims?limit=1'),
        fetch('/api/call-records/requests').then((r) => r.json()),
      ]);
      const recordsData = recordsRes.data;
      const claimsData = claimsRes.data;
      if (recordsData?.success) {
        setRecords(recordsData.data.items || []);
        setTotalPages(recordsData.data.totalPages || 1);
        setTotalCount(recordsData.data.total || 0);
      }
      if (claimsData?.success) setBalance(claimsData.data.balance ?? 0);

      if (reqsRes?.success && Array.isArray(reqsRes.data.items)) {
        const map: Record<string, EditRequestItem> = {};
        reqsRes.data.items.forEach((item: any) => {
          const recId = typeof item.callRecord === 'object' ? item.callRecord?._id : item.callRecord;
          if (recId) {
            // Keep the latest or most active request status
            map[recId] = item;
          }
        });
        setEditRequestsMap(map);
      }

      if (!recordsRes.isStale) {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call Records"
        description="Log and review your cold-calling activity"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowClaim(true)} id="submit-claim-action-btn">
              Claim Rs. {balance.toLocaleString()}
            </Button>
            <Button size="sm" onClick={() => setShowNewRecord(true)} id="new-call-record-btn">
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              New Call
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No call records yet. Click "New Call" to log your first call.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mobile</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="hidden sm:table-cell">Notes</TableHead>
                <TableHead>Logged</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const editRequest = editRequestsMap[record._id];
                return (
                  <TableRow key={record._id}>
                    <TableCell className="font-medium">{record.mobileNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {GRADE_OPTIONS.find((g) => g.value === record.grade)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={OUTCOME_COLORS[record.outcome] ?? 'outline'} className="text-xs capitalize">
                        {CALL_OUTCOMES.find((o) => o.value === record.outcome)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(record.month).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm max-w-[200px] truncate">
                      {record.notes || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      {editRequest?.status === 'approved' ? (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setEditingRecord(record)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit Record
                        </Button>
                      ) : editRequest?.status === 'pending' ? (
                        <Badge
                          variant="outline"
                          className="text-[11px] text-amber-600 border-amber-500/30 bg-amber-500/10 py-1"
                          title="Permission request submitted to admin"
                        >
                          <Clock className="h-3 w-3 mr-1 animate-pulse" />
                          Edit Pending
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setRequestingRecord(record)}
                          title="Request permission to edit this call record"
                        >
                          <KeyRound className="h-3 w-3 mr-1" />
                          Request Edit
                        </Button>
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
              itemName="call records"
            />
          </div>
        </div>
      )}

      <NewCallRecordDialog open={showNewRecord} onClose={() => { handleCloseNewRecord(); fetchRecords(); }} />
      <SubmitClaimDialog open={showClaim} onClose={() => { setShowClaim(false); fetchRecords(); }} balance={balance} />
      <RequestEditDialog
        record={requestingRecord}
        open={Boolean(requestingRecord)}
        onClose={() => setRequestingRecord(null)}
        onSuccess={() => fetchRecords()}
      />
      <AgentEditRecordDialog
        record={editingRecord}
        open={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        onSuccess={() => fetchRecords()}
      />
    </div>
  );
}

export default function AgentCallRecordsPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <CallRecordsContent />
    </Suspense>
  );
}
