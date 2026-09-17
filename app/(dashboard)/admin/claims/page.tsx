'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Search,
  Download,
  Building2,
  User,
  CreditCard,
  FileText,
  RefreshCw,
  Eye,
  AlertCircle,
} from 'lucide-react';

interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName?: string;
}

interface ClaimItem {
  _id: string;
  agent: {
    _id: string;
    name: string;
    email: string;
  };
  requestedAmount: number;
  paidAmount?: number;
  bankDetails: BankDetails;
  status: 'pending' | 'paid' | 'rejected';
  adminNote?: string;
  paidAt?: string;
  processedBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ClaimsStats {
  pendingCount: number;
  pendingAmount: number;
  paidCount: number;
  paidAmount: number;
  rejectedCount: number;
  totalClaims: number;
}

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [stats, setStats] = useState<ClaimsStats>({
    pendingCount: 0,
    pendingAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    rejectedCount: 0,
    totalClaims: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [selectedClaim, setSelectedClaim] = useState<ClaimItem | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Form states for approval/rejection
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchClaims = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/claims?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setClaims(json.data.items || []);
        setTotalPages(json.data.totalPages || 1);
        setTotalCount(json.data.total || 0);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  // Open Approve Dialog
  const handleOpenApprove = (claim: ClaimItem) => {
    setSelectedClaim(claim);
    setPaidAmountInput(String(claim.requestedAmount));
    setAdminNoteInput('');
    setActionError(null);
    setIsApproveOpen(true);
  };

  // Open Reject Dialog
  const handleOpenReject = (claim: ClaimItem) => {
    setSelectedClaim(claim);
    setAdminNoteInput('');
    setActionError(null);
    setIsRejectOpen(true);
  };

  // Open Details Dialog
  const handleOpenDetails = (claim: ClaimItem) => {
    setSelectedClaim(claim);
    setIsDetailsOpen(true);
  };

  // Submit Approval
  const handleSubmitApprove = async () => {
    if (!selectedClaim) return;
    const amount = Number(paidAmountInput);
    if (!amount || amount <= 0) {
      setActionError('Please enter a valid paid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/claims/${selectedClaim._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          paidAmount: amount,
          adminNote: adminNoteInput.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error || 'Failed to approve claim.');
        return;
      }

      setIsApproveOpen(false);
      fetchClaims();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Rejection
  const handleSubmitReject = async () => {
    if (!selectedClaim) return;
    if (!adminNoteInput.trim()) {
      setActionError('Please provide a reason for rejecting this claim request.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/claims/${selectedClaim._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          adminNote: adminNoteInput.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error || 'Failed to reject claim.');
        return;
      }

      setIsRejectOpen(false);
      fetchClaims();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle CSV Export
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ format: 'csv' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/claims?${params.toString()}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `claims-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Loyalty Claims Management"
          description="Review, approve, and disburse agent cash incentive payouts. Track claim history and download CSV records."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchClaims}
            disabled={isLoading}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="text-xs h-8 gap-1.5 shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* 2. Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <Card className="bg-card border-amber-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Approval
              </span>
              <div className="h-7 w-7 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-heading text-foreground">
              {stats.pendingCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">claims</span>
            </div>
            <p className="text-xs font-mono font-medium text-amber-600 mt-1">
              Rs. {stats.pendingAmount.toLocaleString()} requested
            </p>
          </CardContent>
        </Card>

        {/* Paid / Disbursed Card */}
        <Card className="bg-card border-emerald-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Paid Out (Disbursed)
              </span>
              <div className="h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-heading text-foreground">
              {stats.paidCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">claims</span>
            </div>
            <p className="text-xs font-mono font-medium text-emerald-600 mt-1">
              Rs. {stats.paidAmount.toLocaleString()} paid out
            </p>
          </CardContent>
        </Card>

        {/* Rejected Card */}
        <Card className="bg-card border-rose-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Rejected Claims
              </span>
              <div className="h-7 w-7 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-heading text-foreground">
              {stats.rejectedCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">claims</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Denied or invalid details
            </p>
          </CardContent>
        </Card>

        {/* Total Claims Card */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Claims
              </span>
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-heading text-foreground">
              {stats.totalClaims}{' '}
              <span className="text-xs font-normal text-muted-foreground">records</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time submission volume
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-3.5 rounded-xl border bg-card space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <Tabs
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val as any);
              setPage(1);
            }}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-4 sm:flex h-9">
              <TabsTrigger value="all" className="text-xs px-3">
                All
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-3 gap-1.5">
                Pending
                {stats.pendingCount > 0 && (
                  <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] px-1 py-0 h-4 rounded-full font-mono">
                    {stats.pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="paid" className="text-xs px-3">
                Paid
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs px-3">
                Rejected
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search agent, bank, account no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 4. Claims Data Table */}
      <div className="border rounded-xl bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : claims.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="text-sm font-semibold text-foreground">No claims found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {debouncedSearch
                ? `No claim records match "${debouncedSearch}". Try a different search term.`
                : statusFilter !== 'all'
                ? `No claims with status "${statusFilter}" are currently on record.`
                : 'No loyalty withdrawal claims have been submitted by agents yet.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                <TableHead className="py-2.5 font-semibold">Agent</TableHead>
                <TableHead className="py-2.5 font-semibold">Amount</TableHead>
                <TableHead className="py-2.5 font-semibold">Status</TableHead>
                <TableHead className="py-2.5 font-semibold">Bank Destination</TableHead>
                <TableHead className="py-2.5 font-semibold text-right">Date</TableHead>
                <TableHead className="py-2.5 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => {
                const isPending = claim.status === 'pending';
                const isPaid = claim.status === 'paid';
                const isRejected = claim.status === 'rejected';

                return (
                  <TableRow key={claim._id} className="text-xs hover:bg-muted/20">
                    {/* Agent Name & Email */}
                    <TableCell className="py-3 font-medium">
                      <p className="font-semibold text-foreground truncate max-w-[160px] sm:max-w-[200px]">
                        {claim.agent?.name ?? 'Unknown Agent'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[160px] sm:max-w-[200px]">
                        {claim.agent?.email ?? '—'}
                      </p>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="py-3">
                      <span className="font-bold text-foreground font-mono text-sm block">
                        Rs. {claim.requestedAmount.toLocaleString()}
                      </span>
                      {isPaid && claim.paidAmount !== undefined && (
                        <span className="text-[10px] text-emerald-600 font-mono block">
                          Paid: Rs. {claim.paidAmount.toLocaleString()}
                        </span>
                      )}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="py-3">
                      {isPending && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px] font-medium"
                        >
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                      {isPaid && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-medium"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 text-[11px] font-medium"
                        >
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </Badge>
                      )}
                    </TableCell>

                    {/* Bank Details */}
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

                    {/* Date */}
                    <TableCell className="py-3 text-right text-muted-foreground">
                      <span>{format(new Date(claim.createdAt), 'MMM d, yyyy')}</span>
                      <span className="block text-[10px] opacity-70">
                        {format(new Date(claim.createdAt), 'h:mm a')}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenApprove(claim)}
                            className="h-7 text-xs px-2.5 shadow-xs"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReject(claim)}
                            className="h-7 text-xs px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetails(claim)}
                          className="h-7 text-xs px-2 gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        <div className="border-t bg-muted/10 px-4">
          <DataTablePagination
            page={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={20}
            onPageChange={setPage}
            itemName="claims"
          />
        </div>
      </div>

      {/* 5. APPROVE CLAIM DIALOG */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Approve Loyalty Payout
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm bank transfer payout for this agent. This will deduct the amount from their loyalty ledger.
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 py-2 text-xs">
              {/* Agent & Bank Summary Box */}
              <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Agent:</span>
                  <span className="font-semibold text-foreground">
                    {selectedClaim.agent?.name} ({selectedClaim.agent?.email})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Requested Amount:</span>
                  <span className="font-bold font-mono text-sm text-primary">
                    Rs. {selectedClaim.requestedAmount.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-border/60 text-[11px] space-y-1">
                  <p className="text-muted-foreground">
                    <strong>Bank:</strong> {selectedClaim.bankDetails.bankName}{' '}
                    {selectedClaim.bankDetails.branchName ? `(${selectedClaim.bankDetails.branchName})` : ''}
                  </p>
                  <p className="text-muted-foreground font-mono">
                    <strong>Account No:</strong> {selectedClaim.bankDetails.accountNumber}
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Account Name:</strong> {selectedClaim.bankDetails.accountName}
                  </p>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-1.5">
                <Label htmlFor="paidAmount" className="text-xs font-semibold">
                  Paid Amount (LKR) *
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-mono">
                    Rs.
                  </span>
                  <Input
                    id="paidAmount"
                    type="number"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder="Enter paid amount"
                    className="pl-9 h-8 text-xs font-mono"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminNote" className="text-xs font-semibold">
                  Payment Reference / Admin Note (Optional)
                </Label>
                <Input
                  id="adminNote"
                  type="text"
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="e.g. Bank Ref #TXN-82910 completed via online banking"
                  className="h-8 text-xs"
                  maxLength={500}
                />
              </div>

              {actionError && (
                <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsApproveOpen(false)}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSubmitApprove}
              disabled={isSubmitting}
              className="text-xs h-8 shadow-xs"
            >
              {isSubmitting ? 'Processing...' : 'Confirm & Mark Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. REJECT CLAIM DIALOG */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              Reject Loyalty Claim
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a reason for rejecting this claim. The agent will be notified via email and in-app alert.
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <p className="font-semibold text-foreground">
                  {selectedClaim.agent?.name}
                </p>
                <p className="text-muted-foreground font-mono">
                  Requested: Rs. {selectedClaim.requestedAmount.toLocaleString()}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rejectionReason" className="text-xs font-semibold">
                  Reason for Rejection *
                </Label>
                <Textarea
                  id="rejectionReason"
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="e.g. Account number does not match bank name. Please update bank details and submit again."
                  className="text-xs"
                  maxLength={500}
                />
              </div>

              {actionError && (
                <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(false)}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleSubmitReject}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. VIEW CLAIM DETAILS DIALOG */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Claim Audit Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete payout and verification details for this claim
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-medium capitalize ${
                      selectedClaim.status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : selectedClaim.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    }`}
                  >
                    {selectedClaim.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Agent:</span>
                  <span className="font-semibold text-foreground">
                    {selectedClaim.agent?.name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono text-muted-foreground">
                    {selectedClaim.agent?.email}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="text-muted-foreground">Requested:</span>
                  <span className="font-bold font-mono text-foreground">
                    Rs. {selectedClaim.requestedAmount.toLocaleString()}
                  </span>
                </div>

                {selectedClaim.paidAmount !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Paid Amount:</span>
                    <span className="font-bold font-mono text-emerald-600">
                      Rs. {selectedClaim.paidAmount.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Bank Details Block */}
              <div className="p-3 rounded-lg border bg-card space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Beneficiary Bank Account
                </span>
                <p className="text-foreground font-semibold">
                  {selectedClaim.bankDetails.bankName}{' '}
                  {selectedClaim.bankDetails.branchName && (
                    <span className="font-normal text-muted-foreground">
                      ({selectedClaim.bankDetails.branchName})
                    </span>
                  )}
                </p>
                <p className="font-mono text-foreground">
                  Account No: {selectedClaim.bankDetails.accountNumber}
                </p>
                <p className="text-muted-foreground">
                  Account Holder: {selectedClaim.bankDetails.accountName}
                </p>
              </div>

              {/* Processing Info */}
              <div className="p-3 rounded-lg border bg-card space-y-1 text-muted-foreground text-[11px]">
                <p>
                  <strong>Submitted:</strong>{' '}
                  {format(new Date(selectedClaim.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                </p>
                {selectedClaim.paidAt && (
                  <p>
                    <strong>Processed Date:</strong>{' '}
                    {format(new Date(selectedClaim.paidAt), 'yyyy-MM-dd HH:mm:ss')}
                  </p>
                )}
                {selectedClaim.processedBy && (
                  <p>
                    <strong>Processed By:</strong> {selectedClaim.processedBy.name}
                  </p>
                )}
                {selectedClaim.adminNote && (
                  <p className="pt-1 text-foreground border-t mt-1">
                    <strong>Admin Note:</strong> {selectedClaim.adminNote}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDetailsOpen(false)}
              className="text-xs h-8"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
