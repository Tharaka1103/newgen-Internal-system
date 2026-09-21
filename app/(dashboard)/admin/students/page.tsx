'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { AttributionBadge } from '@/components/shared/AttributionBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, UserPlus, AlertCircle, AlertTriangle, Edit, Trash2, Eye,
  GraduationCap, Phone, Calendar, CheckCircle2, CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import { GRADE_OPTIONS, Grade } from '@/lib/types';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { cachedFetch, invalidateClientCache } from '@/lib/utils/cachedFetch';
import { normaliseSLMobile, SL_MOBILE_REGEX } from '@/lib/validations/phone';

interface Student {
  _id: string;
  name: string;
  mobileNumber: string;
  grade: Grade;
  medium?: 'sinhala' | 'english';
  registrationDate: string;
  status: 'active' | 'inactive';
}

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

// ── Mobile number validation helper ──────────────────────────────────────
function validateSLMobile(raw: string): string | null {
  const normalised = normaliseSLMobile(raw.trim());
  if (!SL_MOBILE_REGEX.test(normalised)) {
    return 'Enter a valid Sri Lankan mobile number (e.g. 0711234567 or +94711234567)';
  }
  return null;
}

function StudentsManagementContent() {
  const searchParams = useSearchParams();

  // Determine the initial tab from URL (supports ?tab=payments redirect from old payments page)
  const initialTab = searchParams.get('tab') === 'payments' ? 'payments' : 'students';
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Students tab state ──────────────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'new-student') {
      setShowCreateDialog(true);
    }
  }, [searchParams]);

  const handleCloseCreate = () => {
    setShowCreateDialog(false);
    if (searchParams.get('action') === 'new-student') {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('action');
      const q = p.toString();
      window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);
    }
  };

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      if (gradeFilter && gradeFilter !== 'ALL') params.set('grade', gradeFilter);
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);

      const url = `/api/students?${params.toString()}`;
      const { data, isStale } = await cachedFetch(url);
      if (data?.success) {
        setStudents(data.data.items || []);
        setTotalPages(data.data.totalPages || 1);
        setTotalCount(data.data.total || 0);
      }
      if (!isStale) {
        setIsLoadingStudents(false);
      }
    } catch {
      setIsLoadingStudents(false);
    }
  }, [search, gradeFilter, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchStudents, 250);
    return () => clearTimeout(t);
  }, [fetchStudents]);

  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/students/${deletingStudent._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        invalidateClientCache('/api/students');
        setDeletingStudent(null);
        fetchStudents();
      } else {
        alert(data.error || 'Failed to delete student.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const getGradeLabel = (gValue: string) =>
    GRADE_OPTIONS.find((g) => g.value === gValue)?.label ?? gValue;

  // ── Payments tab state ──────────────────────────────────────────────────
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [paySearch, setPaySearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [payPage, setPayPage] = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [payTotalCount, setPayTotalCount] = useState(0);
  const [showStandalonePayDialog, setShowStandalonePayDialog] = useState(false);

  // Single payment delete state
  const [deletingPayment, setDeletingPayment] = useState<PaymentRecord | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  const handleDeletePaymentConfirm = async () => {
    if (!deletingPayment) return;
    setIsDeletingPayment(true);
    try {
      const res = await fetch(`/api/payments/${deletingPayment._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeletingPayment(null);
        invalidateClientCache('/api/payments');
        fetchPayments();
        fetchDuplicates();
      } else {
        alert(data.error || 'Failed to delete payment record');
      }
    } catch {
      alert('An unexpected error occurred while deleting the payment record.');
    } finally {
      setIsDeletingPayment(false);
    }
  };

  // Duplicate payments detection & cleanup
  const [duplicateInfo, setDuplicateInfo] = useState<{
    totalDuplicateGroups: number;
    totalRedundantRecords: number;
    groups: any[];
  } | null>(null);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [showDeduplicateDialog, setShowDeduplicateDialog] = useState(false);

  const fetchDuplicates = useCallback(async () => {
    try {
      const res = await fetch('/api/payments/duplicates');
      const data = await res.json();
      if (data.success) {
        setDuplicateInfo(data.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDeduplicateConfirm = async () => {
    setIsDeduplicating(true);
    try {
      const res = await fetch('/api/payments/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setShowDeduplicateDialog(false);
        invalidateClientCache('/api/payments');
        fetchPayments();
        fetchDuplicates();
      } else {
        alert(data.error || 'Failed to clean duplicate payment records.');
      }
    } catch {
      alert('An unexpected error occurred while cleaning duplicate payments.');
    } finally {
      setIsDeduplicating(false);
    }
  };

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(payPage), limit: '20' });
      if (paySearch) params.set('search', paySearch);
      if (monthFilter) params.set('month', monthFilter);
      const url = `/api/payments?${params.toString()}`;
      const { data, isStale } = await cachedFetch(url);
      if (data?.success) {
        setPayments(data.data.items || []);
        setPayTotalPages(data.data.totalPages || 1);
        setPayTotalCount(data.data.total || 0);
      }
      if (!isStale) setIsLoadingPayments(false);
    } catch {
      setIsLoadingPayments(false);
    }
  }, [paySearch, monthFilter, payPage]);

  useEffect(() => {
    if (activeTab === 'payments') {
      const t = setTimeout(() => {
        fetchPayments();
        fetchDuplicates();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [fetchPayments, fetchDuplicates, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Students & Payments"
          description={`Manage student enrollment and record payments in one place (${totalCount} students total)`}
        />
        <div className="flex items-center gap-2 self-start sm:self-center">
          {activeTab === 'students' && (
            <Button onClick={() => setShowCreateDialog(true)} id="create-student-btn">
              <UserPlus className="h-4 w-4 mr-2" />
              Register Student
            </Button>
          )}
          {activeTab === 'payments' && (
            <Button onClick={() => setShowStandalonePayDialog(true)} id="create-payment-btn">
              <CreditCard className="h-4 w-4 mr-2" />
              New Payment
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="students" id="tab-students">
            <GraduationCap className="h-4 w-4 mr-1.5" />
            Students
          </TabsTrigger>
          <TabsTrigger value="payments" id="tab-payments">
            <CreditCard className="h-4 w-4 mr-1.5" />
            Payments
          </TabsTrigger>
        </TabsList>

        {/* ── STUDENTS TAB ── */}
        <TabsContent value="students" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or mobile..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-9"
                id="student-search-input"
              />
            </div>

            <Select value={gradeFilter} onValueChange={(val) => { setGradeFilter(val ?? 'ALL'); setPage(1); }}>
              <SelectTrigger className="w-44 h-9 text-xs" id="grade-filter-trigger">
                <SelectValue placeholder="Filter by Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Grades (2 - A/L)</SelectItem>
                {GRADE_OPTIONS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val ?? 'ALL'); setPage(1); }}>
              <SelectTrigger className="w-32 h-9 text-xs" id="status-filter-trigger">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {(search || gradeFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <Button
                variant="ghost" size="sm"
                onClick={() => { setSearch(''); setGradeFilter('ALL'); setStatusFilter('ALL'); setPage(1); }}
                className="text-xs h-9"
              >
                Reset Filters
              </Button>
            )}
          </div>

          {/* Table */}
          {isLoadingStudents ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg w-full" />)}
            </div>
          ) : students.length === 0 ? (
            <div className="border border-dashed rounded-xl p-12 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-medium">No students found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {search || gradeFilter !== 'ALL'
                  ? 'Try changing your search keywords or grade filter.'
                  : 'Start by registering your first student.'}
              </p>
              <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(true)} className="mt-4">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Register Student
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Student</TableHead>
                    <TableHead className="font-semibold">Mobile Number</TableHead>
                    <TableHead className="font-semibold">Grade</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Registration Date</TableHead>
                    <TableHead className="text-right font-semibold pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student._id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[180px] sm:max-w-xs">{student.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{student.mobileNumber}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="font-medium text-xs">
                            {getGradeLabel(student.grade)}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] capitalize font-normal">
                            {student.medium === 'english' ? 'English' : 'Sinhala'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={student.status === 'active' ? 'default' : 'secondary'}
                          className="text-[11px] capitalize"
                        >
                          {student.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(student.registrationDate).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Record Payment — quick action per student row */}
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-primary/70 hover:text-primary hover:bg-primary/10"
                            title="Record Payment"
                            onClick={() => setPaymentStudent(student)}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0"
                            title="View Profile & History"
                            onClick={() => setViewingStudent(student)}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0"
                            title="Edit Student"
                            onClick={() => setEditingStudent(student)}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete Student"
                            onClick={() => setDeletingStudent(student)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t bg-muted/10 px-4">
                <DataTablePagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  pageSize={25}
                  onPageChange={setPage}
                  itemName="students"
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── PAYMENTS TAB ── */}
        <TabsContent value="payments" className="mt-4 space-y-4">
          {/* Duplicate Payments Alert Banner */}
          {duplicateInfo && duplicateInfo.totalRedundantRecords > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <div className="flex items-start sm:items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <h5 className="font-semibold text-sm">Duplicate Payment Records Detected</h5>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Found <strong>{duplicateInfo.totalRedundantRecords} redundant duplicate payment record{duplicateInfo.totalRedundantRecords === 1 ? '' : 's'}</strong> across {duplicateInfo.totalDuplicateGroups} student payment{duplicateInfo.totalDuplicateGroups === 1 ? '' : 's'}. You can clean all duplicates with one click while keeping the original records intact.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeduplicateDialog(true)}
                className="shrink-0 self-start sm:self-center"
                id="clean-duplicates-btn"
              >
                Clean Duplicates
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by mobile..."
                value={paySearch}
                onChange={(e) => { setPaySearch(e.target.value); setPayPage(1); }}
                className="pl-8 h-9"
                id="payments-search"
              />
            </div>
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setPayPage(1); }}
              className="w-40 h-9 text-sm"
              id="payments-month-filter"
            />
            {(paySearch || monthFilter) && (
              <Button
                variant="ghost" size="sm"
                onClick={() => { setPaySearch(''); setMonthFilter(''); setPayPage(1); }}
                className="text-xs h-9"
              >
                Reset
              </Button>
            )}
          </div>

          {isLoadingPayments ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              No payments found. Use &quot;Record Payment&quot; on any student row.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Student</TableHead>
                    <TableHead className="font-semibold">Mobile</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Month</TableHead>
                    <TableHead className="font-semibold">Attributed To</TableHead>
                    <TableHead className="text-right font-semibold">Date</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const redundantPaymentIds = new Set(
                      duplicateInfo?.groups?.flatMap((g: any) => g.payments?.slice(1).map((p: any) => p._id)) || []
                    );
                    const duplicateGroupPaymentIds = new Set(
                      duplicateInfo?.groups?.flatMap((g: any) => g.payments?.map((p: any) => p._id)) || []
                    );

                    return payments.map((payment) => {
                      const isRedundant = redundantPaymentIds.has(payment._id);
                      const isDuplicateGroup = duplicateGroupPaymentIds.has(payment._id);

                      return (
                        <TableRow
                          key={payment._id}
                          className={`hover:bg-muted/20 ${isRedundant ? 'bg-destructive/5' : ''}`}
                        >
                          <TableCell className="font-medium">
                            {payment.student ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{payment.student.name}</p>
                                  {isRedundant ? (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                                      Duplicate
                                    </Badge>
                                  ) : isDuplicateGroup ? (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                      Original
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-[11px] text-muted-foreground capitalize">
                                  {payment.student.grade.replace(/_/g, ' ')}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">—</span>
                                {isRedundant && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                                    Duplicate
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">{payment.mobileNumber}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium font-mono">
                            Rs. {payment.amount.toLocaleString()}
                          </TableCell>
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
                          <TableCell className="text-right text-muted-foreground text-xs">
                            {format(new Date(payment.createdAt), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingPayment(payment)}
                              title="Delete payment record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>

              <div className="border-t bg-muted/10 px-4">
                <DataTablePagination
                  page={payPage}
                  totalPages={payTotalPages}
                  totalItems={payTotalCount}
                  pageSize={20}
                  onPageChange={setPayPage}
                  itemName="payments"
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}

      <CreateStudentDialog
        open={showCreateDialog}
        onClose={() => { handleCloseCreate(); fetchStudents(); }}
      />

      {editingStudent && (
        <EditStudentDialog
          student={editingStudent}
          onClose={() => { setEditingStudent(null); fetchStudents(); }}
        />
      )}

      {viewingStudent && (
        <StudentProfileDialog
          student={viewingStudent}
          onClose={() => setViewingStudent(null)}
          onRecordPayment={(s) => { setViewingStudent(null); setPaymentStudent(s); }}
        />
      )}

      {/* Per-row payment dialog (pre-filled with student) */}
      {paymentStudent && (
        <RecordPaymentDialog
          student={paymentStudent}
          onClose={() => { setPaymentStudent(null); fetchPayments(); }}
        />
      )}

      {/* Standalone payment dialog (from Payments tab header button) */}
      <RecordPaymentDialog
        open={showStandalonePayDialog}
        onClose={() => { setShowStandalonePayDialog(false); fetchPayments(); }}
      />

      <AlertDialog
        open={Boolean(deletingStudent)}
        onOpenChange={(open) => !open && setDeletingStudent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-foreground">{deletingStudent?.name}</span> (
              {deletingStudent?.mobileNumber})? This will remove their record from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Student'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deduplicate Confirmation Dialog */}
      <AlertDialog
        open={showDeduplicateDialog}
        onOpenChange={(open) => !open && setShowDeduplicateDialog(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Clean Duplicate Payment Records?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2.5 text-xs leading-relaxed">
              <p>
                The system detected <strong>{duplicateInfo?.totalRedundantRecords} redundant duplicate payment record{duplicateInfo?.totalRedundantRecords === 1 ? '' : 's'}</strong> across {duplicateInfo?.totalDuplicateGroups} student payment{duplicateInfo?.totalDuplicateGroups === 1 ? '' : 's'}.
              </p>
              <p>
                Deduplication will keep the <strong>first (original)</strong> payment record for each student & month, and safely delete all redundant duplicate records.
              </p>
              <p className="text-muted-foreground/90">
                Any extra credit points awarded for the duplicate records will also be automatically cleaned up to keep agent statistics accurate.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeduplicating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeduplicateConfirm}
              disabled={isDeduplicating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              id="confirm-clean-duplicates-btn"
            >
              {isDeduplicating ? 'Cleaning Duplicates...' : 'Deduplicate & Clean'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Payment Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(deletingPayment)}
        onOpenChange={(open) => !open && setDeletingPayment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Payment Record?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs leading-relaxed">
              <p>
                Are you sure you want to permanently delete the payment record for{' '}
                <strong className="text-foreground">
                  {deletingPayment?.student?.name || deletingPayment?.mobileNumber}
                </strong>{' '}
                of{' '}
                <strong className="text-foreground">
                  Rs. {deletingPayment?.amount?.toLocaleString()}
                </strong>{' '}
                for{' '}
                <strong className="text-foreground">
                  {deletingPayment?.paymentMonth
                    ? new Date(deletingPayment.paymentMonth).toLocaleDateString('en', { month: 'short', year: 'numeric' })
                    : ''}
                </strong>?
              </p>
              <p className="text-muted-foreground">
                This action will remove this payment record from the database and automatically revert any agent credit points awarded for this payment.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPayment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePaymentConfirm}
              disabled={isDeletingPayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              id="confirm-delete-payment-btn"
            >
              {isDeletingPayment ? 'Deleting...' : 'Delete Payment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Register New Student Dialog ─────────────────────────────────────────

function CreateStudentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '', mobileNumber: '', grade: '', medium: 'sinhala' as 'sinhala' | 'english',
  });
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMobileBlur = () => {
    if (!formData.mobileNumber) return;
    const normalised = normaliseSLMobile(formData.mobileNumber.trim());
    setFormData((f) => ({ ...f, mobileNumber: normalised }));
    setMobileError(validateSLMobile(normalised));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) { setError('Please enter student name.'); return; }
    const mErr = validateSLMobile(formData.mobileNumber);
    if (mErr) { setMobileError(mErr); setError(null); return; }
    if (!formData.grade) { setError('Please select a grade (Grade 2 - A/Level).'); return; }

    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, mobileNumber: normaliseSLMobile(formData.mobileNumber) }),
      });
      const data = await res.json();
      if (data.success) {
        invalidateClientCache('/api/students');
        setFormData({ name: '', mobileNumber: '', grade: '', medium: 'sinhala' });
        setMobileError(null);
        onClose();
      } else {
        setError(data.error || 'Failed to register student.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Register Student
          </DialogTitle>
          <DialogDescription>
            Enroll a new student from Grade 2 upwards. Attribution matches automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-1">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="create-student-name">Full Name *</Label>
            <Input
              id="create-student-name"
              placeholder="e.g. Kasun Perera"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-student-mobile">Mobile Number *</Label>
            <Input
              id="create-student-mobile"
              placeholder="0711234567 or +94711234567"
              value={formData.mobileNumber}
              onChange={(e) => { setFormData((f) => ({ ...f, mobileNumber: e.target.value })); setMobileError(null); }}
              onBlur={handleMobileBlur}
              className={mobileError ? 'border-destructive' : ''}
            />
            {mobileError ? (
              <p className="text-[11px] text-destructive">{mobileError}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Sri Lankan mobile format: 07XXXXXXXX, +94XXXXXXXXX
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-student-grade">Academic Grade *</Label>
            <Select value={formData.grade} onValueChange={(v) => setFormData((f) => ({ ...f, grade: v ?? '' }))}>
              <SelectTrigger id="create-student-grade">
                <SelectValue placeholder="Select Grade (Grade 2 - A/Level)" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {GRADE_OPTIONS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-student-medium">Instruction Medium *</Label>
            <Select
              value={formData.medium}
              onValueChange={(v) => setFormData((f) => ({ ...f, medium: (v ?? 'sinhala') as 'sinhala' | 'english' }))}
            >
              <SelectTrigger id="create-student-medium">
                <SelectValue placeholder="Select Medium" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sinhala">Sinhala Medium (Rs. 1,600 / mo)</SelectItem>
                <SelectItem value="english">English Medium (Rs. 2,000 / mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading} id="confirm-create-student">
            {isLoading ? 'Registering...' : 'Register Student'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Student Dialog ─────────────────────────────────────────────────

function EditStudentDialog({ student, onClose }: { student: Student; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: student.name,
    mobileNumber: student.mobileNumber,
    grade: student.grade,
    medium: student.medium || 'sinhala',
    status: student.status || 'active',
  });
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData({
      name: student.name,
      mobileNumber: student.mobileNumber,
      grade: student.grade,
      medium: student.medium || 'sinhala',
      status: student.status || 'active',
    });
  }, [student]);

  const handleMobileBlur = () => {
    if (!formData.mobileNumber) return;
    const normalised = normaliseSLMobile(formData.mobileNumber.trim());
    setFormData((f) => ({ ...f, mobileNumber: normalised }));
    setMobileError(validateSLMobile(normalised));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { setError('Name cannot be empty.'); return; }
    const mErr = validateSLMobile(formData.mobileNumber);
    if (mErr) { setMobileError(mErr); setError(null); return; }

    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/students/${student._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, mobileNumber: normaliseSLMobile(formData.mobileNumber) }),
      });
      const data = await res.json();
      if (data.success) {
        invalidateClientCache('/api/students');
        setSaved(true);
        setTimeout(() => onClose(), 600);
      } else {
        setError(data.error || 'Failed to update student.');
      }
    } catch {
      setError('Failed to update. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>Modify enrollment details and academic grade.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-1">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-student-name">Student Full Name</Label>
            <Input
              id="edit-student-name"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-student-mobile">Mobile Number</Label>
            <Input
              id="edit-student-mobile"
              placeholder="0711234567 or +94711234567"
              value={formData.mobileNumber}
              onChange={(e) => { setFormData((f) => ({ ...f, mobileNumber: e.target.value })); setMobileError(null); }}
              onBlur={handleMobileBlur}
              className={mobileError ? 'border-destructive' : ''}
            />
            {mobileError && <p className="text-[11px] text-destructive">{mobileError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-student-grade">Grade</Label>
            <Select
              value={formData.grade}
              onValueChange={(v) => setFormData((f) => ({ ...f, grade: (v ?? 'grade_2') as Grade }))}
            >
              <SelectTrigger id="edit-student-grade"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {GRADE_OPTIONS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-student-medium">Medium</Label>
            <Select
              value={formData.medium}
              onValueChange={(v) => setFormData((f) => ({ ...f, medium: (v ?? 'sinhala') as 'sinhala' | 'english' }))}
            >
              <SelectTrigger id="edit-student-medium"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sinhala">Sinhala Medium (Rs. 1,600 / mo)</SelectItem>
                <SelectItem value="english">English Medium (Rs. 2,000 / mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-student-status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData((f) => ({ ...f, status: (v ?? 'active') as 'active' | 'inactive' }))}
            >
              <SelectTrigger id="edit-student-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} id="save-student-btn">
            {saved ? (
              <><CheckCircle2 className="h-4 w-4 mr-1.5 text-green-500" /> Updated!</>
            ) : isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Student Profile Dialog ──────────────────────────────────────────────

function StudentProfileDialog({
  student,
  onClose,
  onRecordPayment,
}: {
  student: Student;
  onClose: () => void;
  onRecordPayment: (s: Student) => void;
}) {
  const [profile, setProfile] = useState<{ callRecords: any[]; payments: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${student._id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setProfile(d.data); })
      .finally(() => setIsLoading(false));
  }, [student._id]);

  const gradeName = GRADE_OPTIONS.find((g) => g.value === student.grade)?.label ?? student.grade;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {student.name}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
            <span className="flex items-center gap-1 font-mono text-xs">
              <Phone className="h-3 w-3" />{student.mobileNumber}
            </span>
            <span>·</span>
            <span>{gradeName}</span>
            <span>·</span>
            <Badge variant="secondary" className="text-[10px] capitalize font-normal">
              {student.medium === 'english' ? 'English Medium' : 'Sinhala Medium'}
            </Badge>
            <span>·</span>
            <Badge variant={student.status === 'active' ? 'outline' : 'secondary'} className="text-[10px]">
              {student.status}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="calls" className="flex-1 min-h-0 flex flex-col mt-3">
          <TabsList className="shrink-0 w-full grid grid-cols-2">
            <TabsTrigger value="calls">
              Call Records ({profile?.callRecords?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="payments">
              Payments ({profile?.payments?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto py-3 pr-1 space-y-2">
            {isLoading ? (
              <div className="space-y-2 py-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
              </div>
            ) : (
              <>
                <TabsContent value="calls" className="space-y-2 mt-0">
                  {profile?.callRecords?.length ? (
                    profile.callRecords.map((cr: any) => (
                      <div key={cr._id} className="p-3 border rounded-lg text-xs flex justify-between items-start bg-muted/10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold capitalize text-foreground">
                              {cr.outcome.replace(/_/g, ' ')}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">{cr.month}</Badge>
                          </div>
                          <p className="text-muted-foreground">
                            Agent: {cr.agent?.name || 'Assigned Agent'} ({cr.agent?.email})
                          </p>
                          {cr.notes && (
                            <p className="text-muted-foreground italic bg-muted/40 p-1.5 rounded text-[11px] mt-1">
                              &quot;{cr.notes}&quot;
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                          {new Date(cr.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-muted-foreground text-xs">
                      No call records logged for this student yet.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="payments" className="space-y-2 mt-0">
                  {profile?.payments?.length ? (
                    profile.payments.map((p: any) => (
                      <div key={p._id} className="p-3 border rounded-lg text-xs flex justify-between items-start bg-muted/10">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm text-foreground">Rs. {Number(p.amount).toLocaleString()}</p>
                          <p className="text-muted-foreground">
                            Month: <span className="font-medium text-foreground">{p.paymentMonth}</span>
                          </p>
                          {p.attributedAgent && (
                            <p className="text-primary font-medium text-[11px]">
                              Attributed: {p.attributedAgent.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-muted-foreground block">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                          <Badge variant="outline" className="text-[10px] mt-1">Recorded</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-muted-foreground text-xs">
                      No payments recorded yet.
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        <DialogFooter className="pt-3 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => onRecordPayment(student)}>
            <CreditCard className="h-4 w-4 mr-1.5" />
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Record Payment Dialog ───────────────────────────────────────────────
// Used both from per-row button (student pre-filled) and standalone "New Payment" button.

interface RecordPaymentDialogProps {
  student?: Student;            // pre-filled when opened from a student row
  open?: boolean;               // controlled open state when standalone
  onClose: () => void;
}

interface StudentPreviewItem {
  _id: string;
  name: string;
  grade: string;
  medium?: 'sinhala' | 'english';
  status?: string;
}

function useAttributionPreview(mobileNumber: string, month: string, studentId?: string) {
  const [preview, setPreview] = useState<{
    student?: StudentPreviewItem | null;
    students?: StudentPreviewItem[];
    attribution?: { agentName: string; isExactMonth: boolean; matchedMonth: string } | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!SL_MOBILE_REGEX.test(normaliseSLMobile(mobileNumber)) || !month) {
      setPreview(null);
      return;
    }
    setIsLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ mobileNumber: normaliseSLMobile(mobileNumber), month });
        if (studentId) params.set('studentId', studentId);
        const res = await fetch(`/api/attribution?${params.toString()}`);
        const data = await res.json();
        if (data.success) setPreview(data.data);
      } finally {
        setIsLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [mobileNumber, month, studentId]);

  return { preview, isLoading };
}

function RecordPaymentDialog({ student, open, onClose }: RecordPaymentDialogProps) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [mobileNumber, setMobileNumber] = useState(student?.mobileNumber ?? '');
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(student?._id ?? '');
  const [amount, setAmount] = useState('');
  const [customPrice, setCustomPrice] = useState(false);
  const [month, setMonth] = useState(currentMonth);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Reset when opened with a new student or as standalone
  useEffect(() => {
    setMobileNumber(student?.mobileNumber ?? '');
    setSelectedStudentId(student?._id ?? '');
    setAmount('');
    setCustomPrice(false);
    setMonth(currentMonth);
    setError(null);
    setMobileError(null);
    setSuccess(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?._id, open]);

  const { preview, isLoading: previewLoading } = useAttributionPreview(
    mobileNumber, month, selectedStudentId || student?._id
  );

  // Keep selectedStudentId in sync when preview.students loads
  useEffect(() => {
    if (preview?.students && preview.students.length > 0) {
      const exists = preview.students.some((s) => s._id === selectedStudentId);
      if (!selectedStudentId || !exists) {
        if (student?._id && preview.students.some((s) => s._id === student._id)) {
          setSelectedStudentId(student._id);
        } else {
          setSelectedStudentId(preview.students[0]._id);
        }
      }
    } else if (preview && (!preview.students || preview.students.length === 0)) {
      setSelectedStudentId('');
    }
  }, [preview?.students, selectedStudentId, student?._id]);

  const activeStudent = preview?.students?.find((s) => s._id === selectedStudentId) || preview?.student;

  // Auto-set fee from active student medium
  useEffect(() => {
    if (activeStudent && !customPrice) {
      const defaultFee = activeStudent.medium === 'english' ? 2000 : 1600;
      setAmount(String(defaultFee));
    }
  }, [activeStudent, customPrice]);

  const handleMobileBlur = () => {
    if (!mobileNumber || student) return; // don't revalidate if pre-filled from row
    const normalised = normaliseSLMobile(mobileNumber.trim());
    setMobileNumber(normalised);
    setMobileError(validateSLMobile(normalised));
  };

  const handleSubmit = async () => {
    if (!activeStudent) {
      setError('No student found. Please register the student first.');
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
      const body: Record<string, any> = {
        mobileNumber: normaliseSLMobile(mobileNumber),
        amount: finalAmount,
        paymentMonth: month,
        studentId: activeStudent._id,
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        invalidateClientCache('/api/payments');
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      } else {
        setError(data.error || 'Failed to record payment');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // If opened from a row, it's always open. If standalone, use the `open` prop.
  const isOpen = student != null ? true : (open ?? false);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Record Student Payment
          </DialogTitle>
          <DialogDescription>
            {student
              ? `Recording payment for ${student.name} · ${GRADE_OPTIONS.find((g) => g.value === student.grade)?.label}`
              : 'Enter mobile number to verify student(s) and calculate tuition fees.'}
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
              readOnly={Boolean(student)}
              onChange={(e) => { setMobileNumber(e.target.value); setMobileError(null); }}
              onBlur={handleMobileBlur}
              placeholder="0711234567 or +94711234567"
              autoFocus={!student}
              className={`${mobileError ? 'border-destructive' : ''} ${student ? 'bg-muted/40' : ''}`}
            />
            {mobileError && <p className="text-[11px] text-destructive">{mobileError}</p>}
            {!student && !mobileError && (
              <p className="text-[11px] text-muted-foreground">Sri Lankan mobile: 07XXXXXXXX</p>
            )}
          </div>

          {/* Multi-Student Selection if multiple students registered under this number */}
          {preview?.students && preview.students.length > 1 && (
            <div className="space-y-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <Label htmlFor="select-student" className="text-xs font-semibold text-primary">
                  Select Student ({preview.students.length} found) *
                </Label>
                <Badge variant="outline" className="text-[10px] bg-background border-primary/30 text-primary">
                  Multiple Students
                </Badge>
              </div>
              <Select
                value={selectedStudentId}
                onValueChange={(val) => {
                  if (!val) return;
                  setSelectedStudentId(val);
                  const found = preview.students?.find((s) => s._id === val);
                  if (found && !customPrice) {
                    const defaultFee = found.medium === 'english' ? 2000 : 1600;
                    setAmount(String(defaultFee));
                  }
                }}
                disabled={Boolean(student)}
              >
                <SelectTrigger id="select-student" className="w-full h-10 bg-background text-left">
                  <SelectValue placeholder="Choose student">
                    {(val: any) => {
                      const s = preview?.students?.find((item) => item._id === val) || activeStudent;
                      if (!s) return 'Choose student';
                      const gradeLabel = GRADE_OPTIONS.find((g) => g.value === s.grade)?.label ?? s.grade.replace(/_/g, ' ');
                      const mediumLabel = s.medium === 'english' ? 'English' : 'Sinhala';
                      return `${s.name} · ${gradeLabel} (${mediumLabel} Medium)`;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[--anchor-width]">
                  {preview.students.map((s) => {
                    const gradeLabel = GRADE_OPTIONS.find((g) => g.value === s.grade)?.label ?? s.grade.replace(/_/g, ' ');
                    const mediumLabel = s.medium === 'english' ? 'English' : 'Sinhala';
                    return (
                      <SelectItem
                        key={s._id}
                        value={s._id}
                        label={`${s.name} · ${gradeLabel} (${mediumLabel} Medium)`}
                      >
                        <div className="flex items-center justify-between w-full gap-3 py-0.5">
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-foreground text-xs">{s.name}</span>
                            <span className="text-[11px] text-muted-foreground">{gradeLabel}</span>
                          </div>
                          <Badge
                            variant={s.medium === 'english' ? 'default' : 'secondary'}
                            className="text-[10px] px-1.5 py-0 h-4 capitalize shrink-0"
                          >
                            {mediumLabel}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Multiple students share this mobile number. Select the student you are recording payment for.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="payment-month">Payment Month</Label>
            <Input id="payment-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>

          {/* Student Confirmation Card */}
          {SL_MOBILE_REGEX.test(normaliseSLMobile(mobileNumber)) && (
            <div className="space-y-2">
              {previewLoading ? (
                <div className="p-3.5 rounded-lg border bg-muted/40 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ) : activeStudent ? (
                <div className="p-3.5 rounded-lg border bg-card space-y-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {activeStudent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-tight">{activeStudent.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{mobileNumber}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-[11px] font-medium">
                        {activeStudent.grade.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <Badge
                        variant={activeStudent.medium === 'english' ? 'default' : 'secondary'}
                        className="text-[10px] capitalize"
                      >
                        {activeStudent.medium === 'english' ? 'English Medium' : 'Sinhala Medium'}
                      </Badge>
                    </div>
                  </div>

                  {preview?.attribution && (
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
              ) : preview && !activeStudent ? (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>No student registered with this number. Please register the student first.</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Fee Box */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-foreground">Tuition Fee</Label>
                <p className="text-[11px] text-muted-foreground">
                  {activeStudent?.medium === 'english'
                    ? 'English Medium fee: Rs. 2,000'
                    : 'Sinhala Medium fee: Rs. 1,600'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold font-mono text-primary">
                  Rs. {Number(amount || (activeStudent?.medium === 'english' ? 2000 : 1600)).toLocaleString()}
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
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || success || (SL_MOBILE_REGEX.test(normaliseSLMobile(mobileNumber)) && !activeStudent)}
            id="submit-payment-btn"
          >
            {success ? '✓ Recorded!' : isLoading ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page Shell ───────────────────────────────────────────────────────────

export default function StudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <StudentsManagementContent />
    </Suspense>
  );
}
