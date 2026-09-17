'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { format } from 'date-fns';
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Building2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName?: string;
}

interface ClaimItem {
  _id: string;
  requestedAmount: number;
  paidAmount?: number;
  bankDetails: BankDetails;
  status: 'pending' | 'paid' | 'rejected';
  adminNote?: string;
  paidAt?: string;
  createdAt: string;
}

export default function AgentClaimsPage() {
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // New claim dialog
  const [isOpen, setIsOpen] = useState(false);
  const [requestedAmount, setRequestedAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchClaims = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/claims?page=${page}&limit=15`);
      const json = await res.json();
      if (json.success) {
        setClaims(json.data.items || []);
        setTotalPages(json.data.totalPages || 1);
        setTotalCount(json.data.total || 0);
        if (json.data.balance !== undefined) {
          setBalance(json.data.balance);
        }
      }
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const hasPendingClaim = claims.some((c) => c.status === 'pending');

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amount = Number(requestedAmount);
    if (!amount || amount <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (amount > balance) {
      setFormError(`Requested amount (Rs. ${amount.toLocaleString()}) exceeds your available balance (Rs. ${balance.toLocaleString()}).`);
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      setFormError('Please complete all required bank account details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedAmount: amount,
          bankDetails: {
            bankName: bankName.trim(),
            branchName: branchName.trim() || undefined,
            accountNumber: accountNumber.trim(),
            accountName: accountName.trim(),
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setFormError(json.error || 'Failed to submit claim.');
        return;
      }

      setIsOpen(false);
      setRequestedAmount('');
      fetchClaims();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Loyalty Cash Claims"
          description="Withdraw your earned agent loyalty cash rewards directly to your bank account"
        />
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            setFormError(null);
            setRequestedAmount(String(balance > 0 ? balance : ''));
            setIsOpen(true);
          }}
          disabled={balance <= 0 || hasPendingClaim}
          className="text-xs h-8 gap-1.5 shadow-sm"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Request Payout
        </Button>
      </div>

      {/* Balance & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-primary/30">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Available Loyalty Balance
            </span>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold font-mono text-primary">
              Rs. {balance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Earned from registered student enrollments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Claim Status
            </span>
          </CardHeader>
          <CardContent className="pt-0">
            {hasPendingClaim ? (
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Pending Review by Administrator</span>
              </div>
            ) : balance > 0 ? (
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Eligible for Withdrawal</span>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                No claimable balance currently. Make calls to earn!
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {hasPendingClaim
                ? 'Only 1 pending claim request is allowed at a time'
                : 'Payouts are verified and disbursed to your bank'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              How It Works
            </span>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground space-y-1">
            <p>1. Earn Rs. 100 for each new student registered.</p>
            <p>2. Request a withdrawal with your verified bank details.</p>
            <p>3. School administration transfers cash to your account.</p>
          </CardContent>
        </Card>
      </div>

      {/* Claims History Table */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Your Withdrawal History
          </CardTitle>
          <CardDescription className="text-xs">
            Past payout requests and administration verification status
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2 py-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : claims.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              You have not submitted any loyalty withdrawal claims yet.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                    <TableHead className="py-2.5 font-semibold">Amount</TableHead>
                    <TableHead className="py-2.5 font-semibold">Status</TableHead>
                    <TableHead className="py-2.5 font-semibold">Bank Destination</TableHead>
                    <TableHead className="py-2.5 font-semibold">Admin Remarks</TableHead>
                    <TableHead className="py-2.5 font-semibold text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim._id} className="text-xs hover:bg-muted/20">
                      <TableCell className="py-3 font-bold font-mono text-sm">
                        Rs. {claim.requestedAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="py-3">
                        {claim.status === 'pending' && (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px]"
                          >
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {claim.status === 'paid' && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px]"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Paid
                          </Badge>
                        )}
                        {claim.status === 'rejected' && (
                          <Badge
                            variant="outline"
                            className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 text-[11px]"
                          >
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="font-medium text-foreground">
                          {claim.bankDetails.bankName}{' '}
                          {claim.bankDetails.branchName && (
                            <span className="text-muted-foreground font-normal">
                              ({claim.bankDetails.branchName})
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          A/C: {claim.bankDetails.accountNumber} • {claim.bankDetails.accountName}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                        {claim.adminNote || '—'}
                      </TableCell>
                      <TableCell className="py-3 text-right text-muted-foreground text-xs">
                        {format(new Date(claim.createdAt), 'MMM d, yyyy')}
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
                  pageSize={15}
                  onPageChange={setPage}
                  itemName="claims"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit New Claim Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Request Loyalty Cash Payout
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter the amount you wish to withdraw and your bank account details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitClaim} className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
              <span className="text-muted-foreground">Available Balance:</span>
              <span className="font-bold font-mono text-sm text-primary">
                Rs. {balance.toLocaleString()}
              </span>
            </div>

            <div className="space-y-1">
              <Label htmlFor="reqAmount" className="text-xs font-semibold">
                Withdrawal Amount (LKR) *
              </Label>
              <Input
                id="reqAmount"
                type="number"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                placeholder="Amount to withdraw"
                className="h-8 text-xs font-mono"
                max={balance}
                min="1"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bankName" className="text-xs font-semibold">
                Bank Name *
              </Label>
              <Input
                id="bankName"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Commercial Bank of Ceylon"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="branchName" className="text-xs font-semibold">
                Branch Name (Optional)
              </Label>
              <Input
                id="branchName"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Colombo Fort Branch"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="accountNumber" className="text-xs font-semibold">
                Account Number *
              </Label>
              <Input
                id="accountNumber"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 1000293848"
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="accountName" className="text-xs font-semibold">
                Account Holder Name *
              </Label>
              <Input
                id="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Name exactly as on bank passbook"
                className="h-8 text-xs"
                required
              />
            </div>

            {formError && (
              <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmitting}
                className="text-xs h-8 shadow-xs"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Claim'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
