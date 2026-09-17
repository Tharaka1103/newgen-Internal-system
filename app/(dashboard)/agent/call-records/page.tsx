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
import { AlertCircle, Phone } from 'lucide-react';
import { CALL_OUTCOMES, GRADE_OPTIONS } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface CallRecord {
  _id: string;
  mobileNumber: string;
  grade: string;
  month: string;
  outcome: string;
  notes?: string;
  createdAt: string;
}

// New Call Record Form
function NewCallRecordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const [mobileNumber, setMobileNumber] = useState('');
  const [grade, setGrade] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!grade || !outcome) { setError('Please fill in all required fields.'); return; }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/call-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, grade, month, outcome, notes }),
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
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Log Call Record</DialogTitle>
          <DialogDescription>Record a call you made to a prospective student.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4 py-2 pr-1">
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="cr-mobile">Mobile Number <span className="text-destructive">*</span></Label>
            <Input id="cr-mobile" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="07X XXXX XXX" />
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
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [balance, setBalance] = useState(0);

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
    setIsLoading(true);
    try {
      const [recordsRes, claimsRes] = await Promise.all([
        fetch('/api/call-records?limit=50'),
        fetch('/api/claims?limit=1'),
      ]);
      const [recordsData, claimsData] = await Promise.all([recordsRes.json(), claimsRes.json()]);
      if (recordsData.success) setRecords(recordsData.data.items);
      if (claimsData.success) setBalance(claimsData.data.balance ?? 0);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
                <TableHead className="text-right">Logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
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
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NewCallRecordDialog open={showNewRecord} onClose={() => { handleCloseNewRecord(); fetchRecords(); }} />
      <SubmitClaimDialog open={showClaim} onClose={() => { setShowClaim(false); fetchRecords(); }} balance={balance} />
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
