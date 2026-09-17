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
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { cachedFetch, invalidateClientCache } from '@/lib/utils/cachedFetch';

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

interface StudentPreview {
  _id: string;
  name: string;
  grade: string;
  medium?: 'sinhala' | 'english';
  status?: string;
}

// Attribution preview hook
function useAttributionPreview(mobileNumber: string, month: string) {
  const [preview, setPreview] = useState<{
    student?: StudentPreview | null;
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
    }, 350);
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
  const [customPrice, setCustomPrice] = useState(false);
  const [month, setMonth] = useState(currentMonth);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { preview, isLoading: previewLoading } = useAttributionPreview(mobileNumber, month);

  // Automatically update price whenever student is identified based on their medium
  useEffect(() => {
    if (preview?.student) {
      const defaultFee = preview.student.medium === 'english' ? 2000 : 1600;
      setAmount(String(defaultFee));
    }
  }, [preview?.student]);

  const handleSubmit = async () => {
    if (!preview?.student) {
      setError('No student found with this mobile number. Please register the student first.');
      return;
    }
    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, amount: finalAmount, paymentMonth: month }),
      });
      const data = await res.json();
      if (data.success) {
        invalidateClientCache('/api/payments');
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setMobileNumber('');
          setAmount('');
          onClose();
        }, 1200);
      } else {
        setError(data.error || 'Failed to record payment');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Record Student Payment</DialogTitle>
          <DialogDescription>
            Enter mobile number to instantly verify the student and calculate tuition fees.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2 pr-1">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="payment-mobile">Student Mobile Number *</Label>
            <Input
              id="payment-mobile"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="07X XXXXXXX"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-month">Payment Month</Label>
            <Input id="payment-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>

          {/* Student Confirmation Card (Instant Verification) */}
          {mobileNumber.length >= 9 && (
            <div className="space-y-2">
              {previewLoading ? (
                <div className="p-3.5 rounded-lg border bg-muted/40 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ) : preview?.student ? (
                <div className="p-3.5 rounded-lg border bg-card space-y-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {preview.student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-tight">{preview.student.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{mobileNumber}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-[11px] font-medium">
                        {preview.student.grade.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge
                        variant={preview.student.medium === 'english' ? 'default' : 'secondary'}
                        className="text-[10px] capitalize"
                      >
                        {preview.student.medium === 'english' ? 'English Medium' : 'Sinhala Medium'}
                      </Badge>
                    </div>
                  </div>

                  {preview.attribution && (
                    <div className="pt-2 border-t flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">Attributed Agent:</span>
                      <AttributionBadge
                        agentName={preview.attribution.agentName}
                        isExactMonth={preview.attribution.isExactMonth}
                        matchedMonth={preview.attribution.matchedMonth}
                      />
                    </div>
                  )}
                </div>
              ) : preview && !preview.student ? (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>No student registered with this number. Please register the student first.</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Automatic Fee Box */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-foreground">Tuition Fee</Label>
                <p className="text-[11px] text-muted-foreground">
                  {preview?.student?.medium === 'english'
                    ? 'English Medium fee: Rs. 2,000'
                    : 'Sinhala Medium fee: Rs. 1,600'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold font-mono text-primary">
                  Rs. {Number(amount || (preview?.student?.medium === 'english' ? 2000 : 1600)).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setCustomPrice(!customPrice)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                {customPrice ? 'Use standard automated fee' : 'Customize fee amount manually'}
              </button>
            </div>

            {customPrice && (
              <div className="pt-2">
                <Input
                  id="payment-amount"
                  type="number"
                  min="0"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Custom amount"
                  className="h-8 text-xs font-mono"
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 pt-3 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || success || (mobileNumber.length >= 9 && !preview?.student)}
            id="submit-payment-btn"
          >
            {success ? '✓ Recorded!' : isLoading ? 'Recording...' : 'Record Payment'}
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (monthFilter) params.set('month', monthFilter);
      const url = `/api/payments?${params.toString()}`;
      const { data, isStale } = await cachedFetch(url);
      if (data?.success) {
        setPayments(data.data.items || []);
        setTotalPages(data.data.totalPages || 1);
        setTotalCount(data.data.total || 0);
      }
      if (!isStale) {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }, [search, monthFilter, page]);

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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8 h-9"
            id="payments-search"
          />
        </div>
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value);
            setPage(1);
          }}
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

          {/* Pagination */}
          <div className="border-t bg-muted/10 px-4">
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={20}
              onPageChange={setPage}
              itemName="payments"
            />
          </div>
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
