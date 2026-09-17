'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { AttributionBadge } from '@/components/shared/AttributionBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Search } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentRecord {
  _id: string;
  mobileNumber: string;
  amount: number;
  paymentMonth: string;
  student?: { name: string; grade: string };
  attributedAgent?: { name: string };
  createdBy?: { name: string };
  createdAt: string;
}

// Attribution preview hook
function useAttributionPreview(mobileNumber: string, month: string) {
  const [preview, setPreview] = useState<{
    student?: { name: string; grade: string } | null;
    attribution?: { agentName: string; isExactMonth: boolean; matchedMonth: string } | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mobileNumber.length < 9 || !month) {
      setPreview(null);
      return;
    }
    setIsLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/attribution?mobileNumber=${encodeURIComponent(mobileNumber)}&month=${month}`);
        const data = await res.json();
        if (data.success) setPreview(data.data);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [mobileNumber, month]);

  return { preview, isLoading };
}

// Create Payment Dialog
function CreatePaymentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [mobileNumber, setMobileNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { preview, isLoading: previewLoading } = useAttributionPreview(mobileNumber, month);

  const handleSubmit = async () => {
    if (!preview?.student) {
      setError('No student found with this mobile number. Please register the student first.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, amount: parseFloat(amount), paymentMonth: month }),
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
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Attribution is resolved automatically based on call records.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4 py-2 pr-1">
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="payment-mobile">Mobile Number</Label>
            <Input
              id="payment-mobile"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="07X XXXX XXX"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-month">Payment Month</Label>
            <Input id="payment-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>

          {/* Live attribution preview */}
          {mobileNumber.length >= 9 && month && (
            <div className="p-3 rounded-md bg-muted/50 space-y-2">
              {previewLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : preview ? (
                <>
                  {preview.student ? (
                    <p className="text-sm font-medium">{preview.student.name}</p>
                  ) : (
                    <p className="text-sm text-destructive">No student found with this mobile number</p>
                  )}
                  <AttributionBadge
                    agentName={preview.attribution?.agentName}
                    isExactMonth={preview.attribution?.isExactMonth}
                    matchedMonth={preview.attribution?.matchedMonth}
                    noMatch={!preview.attribution}
                  />
                </>
              ) : null}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="payment-amount">Amount (Rs.)</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 pt-3 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || success} id="submit-payment-btn">
            {success ? '✓ Saved!' : isLoading ? 'Saving...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentsContent() {
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowCreate(true);
    }
  }, [searchParams]);

  const handleCloseCreate = () => {
    setShowCreate(false);
    if (searchParams.get('action') === 'new') {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('action');
      const q = p.toString();
      window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);
    }
  };

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (search) params.set('search', search);
      if (monthFilter) params.set('month', monthFilter);
      const res = await fetch(`/api/payments?${params.toString()}`);
      const data = await res.json();
      if (data.success) setPayments(data.data.items);
    } finally {
      setIsLoading(false);
    }
  }, [search, monthFilter]);

  useEffect(() => {
    const t = setTimeout(fetchPayments, 250);
    return () => clearTimeout(t);
  }, [fetchPayments]);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Record and track student payments with automatic agent attribution" />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
            id="payments-search"
          />
        </div>
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-40 h-9 text-sm"
          id="payments-month-filter"
        />
        <Button size="sm" onClick={() => setShowCreate(true)} id="create-payment-btn">
          New Payment
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">No payments found.</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Attributed To</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell className="font-medium">
                    {payment.student?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.mobileNumber}</TableCell>
                  <TableCell className="text-right font-medium">Rs. {payment.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(payment.paymentMonth).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    {payment.attributedAgent ? (
                      <Badge variant="secondary" className="text-xs">{payment.attributedAgent.name}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {format(new Date(payment.createdAt), 'dd MMM yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreatePaymentDialog open={showCreate} onClose={() => { handleCloseCreate(); fetchPayments(); }} />
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <PaymentsContent />
    </Suspense>
  );
}
