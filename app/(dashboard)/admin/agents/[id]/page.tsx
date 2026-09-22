'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Headphones, PhoneCall, CheckCircle2, Clock,
  Wallet, ArrowUpRight, ArrowDownLeft, Shield, Search,
  Check, AlertCircle, FileText,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { CALL_OUTCOMES, GRADE_OPTIONS } from '@/lib/types';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

interface AgentProfile {
  _id: string;
  name: string;
  email: string;
  role: 'agent';
  status: 'active' | 'disabled';
  permissions: string[];
  createdAt: string;
  remainingBalance: number;
  totalEarned: number;
  totalPaid: number;
  pendingClaimAmount: number;
  callRecordsCount: number;
  callStats?: {
    total: number;
    successCalls: number;
    interested: number;
    callBackLater: number;
    notInterested: number;
    noAnswer: number;
    conversionRate: number;
  };
}

interface CallRecordItem {
  _id: string;
  mobileNumber: string;
  grade: string;
  month: string;
  outcome: string;
  notes?: string;
  createdAt: string;
}

interface LedgerItem {
  _id: string;
  type: 'earned' | 'claimed';
  amount: number;
  description?: string;
  createdAt: string;
}

interface ClaimItem {
  _id: string;
  requestedAmount: number;
  paidAmount?: number;
  status: 'pending' | 'paid' | 'rejected';
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    branchName?: string;
  };
  adminNote?: string;
  createdAt: string;
  paidAt?: string;
  processedBy?: { name: string };
}

const OUTCOME_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  interested: { label: 'Interested', variant: 'default' },
  not_interested: { label: 'Not Interested', variant: 'destructive' },
  call_back_later: { label: 'Call Back Later', variant: 'secondary' },
  no_answer: { label: 'No Answer', variant: 'outline' },
};

export default function AgentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);

  // ── Calls Tab State ──────────────────────────────────────────────────
  const [calls, setCalls] = useState<CallRecordItem[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState(false);
  const [callSearch, setCallSearch] = useState('');
  const [callOutcome, setCallOutcome] = useState('ALL');
  const [callPage, setCallPage] = useState(1);
  const [callTotalPages, setCallTotalPages] = useState(1);
  const [callTotalCount, setCallTotalCount] = useState(0);

  // ── Ledger Tab State ─────────────────────────────────────────────────
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [ledgerTotalCount, setLedgerTotalCount] = useState(0);

  // ── Claims Tab State ─────────────────────────────────────────────────
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [claimPage, setClaimPage] = useState(1);
  const [claimTotalPages, setClaimTotalPages] = useState(1);
  const [claimTotalCount, setClaimTotalCount] = useState(0);

  // Fetch Agent Profile & Overview Stats
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      const data = await res.json();
      if (data.success) {
        setAgent(data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingProfile(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fetch Calls
  const fetchCalls = useCallback(async () => {
    setIsLoadingCalls(true);
    try {
      const p = new URLSearchParams({
        agentId: id,
        page: String(callPage),
        limit: '15',
      });
      if (callSearch) p.set('search', callSearch);
      if (callOutcome && callOutcome !== 'ALL') p.set('outcome', callOutcome);

      const res = await fetch(`/api/call-records?${p.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCalls(data.data.items || []);
        setCallTotalPages(data.data.totalPages || 1);
        setCallTotalCount(data.data.total || 0);
      }
    } finally {
      setIsLoadingCalls(false);
    }
  }, [id, callPage, callSearch, callOutcome]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Fetch Ledger
  const fetchLedger = useCallback(async () => {
    setIsLoadingLedger(true);
    try {
      const p = new URLSearchParams({
        page: String(ledgerPage),
        limit: '15',
      });
      const res = await fetch(`/api/users/${id}/ledger?${p.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLedger(data.data.items || []);
        setLedgerTotalPages(data.data.totalPages || 1);
        setLedgerTotalCount(data.data.total || 0);
      }
    } finally {
      setIsLoadingLedger(false);
    }
  }, [id, ledgerPage]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Fetch Claims
  const fetchClaims = useCallback(async () => {
    setIsLoadingClaims(true);
    try {
      const p = new URLSearchParams({
        agentId: id,
        page: String(claimPage),
        limit: '15',
      });
      const res = await fetch(`/api/claims?${p.toString()}`);
      const data = await res.json();
      if (data.success) {
        setClaims(data.data.items || []);
        setClaimTotalPages(data.data.totalPages || 1);
        setClaimTotalCount(data.data.total || 0);
      }
    } finally {
      setIsLoadingClaims(false);
    }
  }, [id, claimPage]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="text-lg font-semibold">Agent Not Found</h3>
        <p className="text-sm text-muted-foreground">The requested agent could not be found or has been deleted.</p>
        <Button variant="outline" onClick={() => router.push('/admin/agents')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>
      </div>
    );
  }

  const callStats = agent.callStats || {
    total: agent.callRecordsCount || 0,
    successCalls: 0,
    interested: 0,
    callBackLater: 0,
    notInterested: 0,
    noAnswer: 0,
    conversionRate: 0,
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar & Header ── */}
      <div className="flex flex-col gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground text-xs"
            onClick={() => router.push('/admin/agents')}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Agents
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold tracking-tight">{agent.name}</h2>
                <Badge
                  variant={agent.status === 'active' ? 'outline' : 'destructive'}
                  className="text-xs capitalize"
                >
                  {agent.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                <span>{agent.email}</span>
                <span>•</span>
                <span>Member since {format(new Date(agent.createdAt), 'dd MMM yyyy')} ({formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {agent.remainingBalance > 0 && (
              <Button
                onClick={() => setShowPayoutDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                id="agent-page-payout-btn"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Record Payout (Rs. {agent.remainingBalance.toLocaleString()})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Performance & Financial KPI Statistics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Calls */}
        <Card>
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Calls</CardTitle>
            <Headphones className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold font-mono">{callStats.total}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">All logged calls</p>
          </CardContent>
        </Card>

        {/* Successful Calls */}
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Success Calls</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {callStats.successCalls}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {callStats.conversionRate}% conversion rate
            </p>
          </CardContent>
        </Card>

        {/* Follow-up Calls */}
        <Card>
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Callbacks / Pending</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-bold font-mono">{callStats.callBackLater}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {callStats.interested > 0 ? `${callStats.interested} interested · ` : ''}{callStats.noAnswer} no answer
            </p>
          </CardContent>
        </Card>

        {/* Remaining Payable Balance */}
        <Card className="bg-emerald-500/10 border-emerald-500/25">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Remaining Payable</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              Rs. {agent.remainingBalance.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {agent.pendingClaimAmount > 0 ? `Rs. ${agent.pendingClaimAmount.toLocaleString()} claim pending` : 'Net owed'}
            </p>
          </CardContent>
        </Card>

        {/* Cumulative Earned */}
        <Card>
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Earned</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-bold font-mono">Rs. {agent.totalEarned.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Cumulative credits</p>
          </CardContent>
        </Card>

        {/* Cumulative Paid Out */}
        <Card>
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Paid</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-bold font-mono">Rs. {agent.totalPaid.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Disbursed payouts</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed Content ── */}
      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="calls" className="text-xs">
            <Headphones className="h-3.5 w-3.5 mr-1.5" />
            Call Records ({callTotalCount})
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs">
            <Wallet className="h-3.5 w-3.5 mr-1.5" />
            Loyalty Ledger ({ledgerTotalCount})
          </TabsTrigger>
          <TabsTrigger value="claims" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Claims & Payouts ({claimTotalCount})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="text-xs">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Permissions ({agent.permissions?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* ── Call Records Tab ── */}
        <TabsContent value="calls" className="space-y-4 mt-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by student mobile..."
                value={callSearch}
                onChange={(e) => { setCallSearch(e.target.value); setCallPage(1); }}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <Select
              value={callOutcome}
              onValueChange={(val) => { setCallOutcome(val ?? 'ALL'); setCallPage(1); }}
            >
              <SelectTrigger className="w-40 h-9 text-xs">
                <SelectValue placeholder="Outcome Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Outcomes</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="call_back_later">Call Back Later</SelectItem>
                <SelectItem value="not_interested">Not Interested</SelectItem>
                <SelectItem value="no_answer">No Answer</SelectItem>
              </SelectContent>
            </Select>

            {(callSearch || callOutcome !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-9"
                onClick={() => { setCallSearch(''); setCallOutcome('ALL'); setCallPage(1); }}
              >
                Reset
              </Button>
            )}
          </div>

          {isLoadingCalls ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : calls.length === 0 ? (
            <div className="border border-dashed rounded-xl p-12 text-center text-sm text-muted-foreground">
              No call records found for this agent matching the criteria.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Mobile Number</TableHead>
                    <TableHead className="font-semibold">Grade</TableHead>
                    <TableHead className="font-semibold">Outcome</TableHead>
                    <TableHead className="font-semibold">Target Month</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                    <TableHead className="text-right font-semibold pr-4">Logged Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => {
                    const badge = OUTCOME_BADGES[call.outcome] || { label: call.outcome, variant: 'outline' };
                    return (
                      <TableRow key={call._id} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-xs font-medium">
                          {call.mobileNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {GRADE_OPTIONS.find((g) => g.value === call.grade)?.label || call.grade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className="text-xs capitalize">
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(call.month), 'MMMM yyyy')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                          {call.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs pr-4">
                          {format(new Date(call.createdAt), 'dd MMM yyyy, HH:mm')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="border-t bg-muted/10 px-4">
                <DataTablePagination
                  page={callPage}
                  totalPages={callTotalPages}
                  totalItems={callTotalCount}
                  pageSize={15}
                  onPageChange={setCallPage}
                  itemName="calls"
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Loyalty Ledger Tab ── */}
        <TabsContent value="ledger" className="space-y-4 mt-2">
          {isLoadingLedger ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : ledger.length === 0 ? (
            <div className="border border-dashed rounded-xl p-12 text-center text-sm text-muted-foreground">
              No loyalty ledger transactions recorded for this agent.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                    <TableHead className="text-right font-semibold pr-4">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((item) => (
                    <TableRow key={item._id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${item.amount >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                            {item.amount >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                          </div>
                          <Badge variant={item.type === 'earned' ? 'default' : 'secondary'} className="text-[11px] capitalize">
                            {item.type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {item.description || (item.type === 'earned' ? 'Credit Point / Student Match' : 'Disbursement Payout')}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm">
                        <span className={item.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                          {item.amount >= 0 ? '+' : ''}Rs. {Math.abs(item.amount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs pr-4">
                        {format(new Date(item.createdAt), 'dd MMM yyyy, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t bg-muted/10 px-4">
                <DataTablePagination
                  page={ledgerPage}
                  totalPages={ledgerTotalPages}
                  totalItems={ledgerTotalCount}
                  pageSize={15}
                  onPageChange={setLedgerPage}
                  itemName="transactions"
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Claims & Payouts Tab ── */}
        <TabsContent value="claims" className="space-y-4 mt-2">
          {isLoadingClaims ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : claims.length === 0 ? (
            <div className="border border-dashed rounded-xl p-12 text-center text-sm text-muted-foreground">
              No claim requests or manual payouts found.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Disbursement Details</TableHead>
                    <TableHead className="font-semibold">Remarks</TableHead>
                    <TableHead className="text-right font-semibold pr-4">Dates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim._id} className="hover:bg-muted/20">
                      <TableCell>
                        <Badge
                          variant={claim.status === 'paid' ? 'default' : claim.status === 'rejected' ? 'destructive' : 'outline'}
                          className="capitalize text-xs"
                        >
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold">
                        Rs. {(claim.paidAmount || claim.requestedAmount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {claim.bankDetails ? (
                          <div>
                            <p className="font-medium text-foreground">{claim.bankDetails.bankName}</p>
                            <p className="text-muted-foreground text-[11px]">
                              {claim.bankDetails.accountNumber} ({claim.bankDetails.accountName})
                            </p>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground italic max-w-[200px] truncate">
                        {claim.adminNote || '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground pr-4">
                        <p>Requested: {format(new Date(claim.createdAt), 'dd MMM yyyy')}</p>
                        {claim.paidAt && (
                          <p className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                            Paid: {format(new Date(claim.paidAt), 'dd MMM yyyy')}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t bg-muted/10 px-4">
                <DataTablePagination
                  page={claimPage}
                  totalPages={claimTotalPages}
                  totalItems={claimTotalCount}
                  pageSize={15}
                  onPageChange={setClaimPage}
                  itemName="claims"
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Permissions Tab ── */}
        <TabsContent value="permissions" className="mt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Assigned System Permissions ({agent.permissions?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agent.permissions?.length ? (
                <div className="flex flex-wrap gap-2">
                  {agent.permissions.map((perm) => (
                    <Badge key={perm} variant="secondary" className="font-mono text-xs px-2.5 py-1">
                      {perm}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No specific permissions granted.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Manual Payout Dialog ── */}
      {showPayoutDialog && (
        <AgentPagePayoutDialog
          agent={agent}
          onClose={() => setShowPayoutDialog(false)}
          onSuccess={() => {
            fetchProfile();
            fetchLedger();
            fetchClaims();
            setShowPayoutDialog(false);
          }}
        />
      )}
    </div>
  );
}

// ── Standalone Payout Dialog for Agent Page ──

function AgentPagePayoutDialog({
  agent,
  onClose,
  onSuccess,
}: {
  agent: AgentProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const currentBalance = agent.remainingBalance ?? 0;
  const [amount, setAmount] = useState(currentBalance > 0 ? String(currentBalance) : '');
  const [note, setNote] = useState('');
  const [accountName, setAccountName] = useState(agent.name);
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('Direct / Cash / Bank Transfer');
  const [branchName, setBranchName] = useState('');
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please specify a valid payment amount greater than 0.');
      return;
    }
    if (num > currentBalance) {
      setError(`Amount cannot exceed the agent's remaining balance of Rs. ${currentBalance.toLocaleString()}.`);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${agent._id}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: num,
          note: note.trim() || undefined,
          bankDetails: {
            accountName: accountName.trim(),
            accountNumber: accountNumber.trim() || 'Direct Payout',
            bankName: bankName.trim(),
            branchName: branchName.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 800);
      } else {
        setError(data.error || 'Failed to record payout.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Record Agent Payment
          </DialogTitle>
          <DialogDescription>
            Record a direct payment/payout to <strong>{agent.name}</strong> ({agent.email}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Payable Balance</p>
              <h4 className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                Rs. {currentBalance.toLocaleString()}
              </h4>
            </div>
            {currentBalance > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 border-emerald-500/30 hover:bg-emerald-500/20"
                onClick={() => setAmount(String(currentBalance))}
              >
                Pay Full
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="agent-page-payout-amount">Amount to Pay (Rs.) *</Label>
            <Input
              id="agent-page-payout-amount"
              type="number"
              min={1}
              max={currentBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agent-page-payout-note">Payment Note / Reference (optional)</Label>
            <Input
              id="agent-page-payout-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bank Ref #99283 / Paid in cash"
            />
          </div>

          <div className="border rounded-lg p-3 bg-muted/20 space-y-2.5">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setShowBankDetails(!showBankDetails)}
            >
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Disbursement Bank Details (optional)
              </span>
              <span className="text-xs text-primary">{showBankDetails ? 'Hide' : 'Add'}</span>
            </div>

            {showBankDetails && (
              <div className="space-y-2 pt-1 border-t">
                <div className="space-y-1">
                  <Label className="text-xs">Account Holder Name</Label>
                  <Input
                    className="h-8 text-xs"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Bank Name</Label>
                    <Input
                      className="h-8 text-xs"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Account Number</Label>
                    <Input
                      className="h-8 text-xs"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Account or Ref"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            * This payment will immediately deduct from the agent's remaining balance and create a paid record in claims history.
          </p>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSubmit}
            disabled={isLoading || success || currentBalance <= 0}
            id="agent-page-confirm-payout-btn"
          >
            {success ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-white" />
                Payment Recorded!
              </>
            ) : isLoading ? (
              'Processing...'
            ) : (
              'Confirm Payout'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
