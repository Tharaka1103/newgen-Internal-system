'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, UserPlus, AlertCircle, CheckCircle2, X, Shield } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GRADE_OPTIONS, ADMIN_PERMISSIONS, DEFAULT_AGENT_PERMISSIONS, Permission } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

// ── Staff tab ────────────────────────────────────────────────

interface StaffUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions: string[];
  createdAt: string;
}

function StaffTab() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'new-staff') {
      setShowCreateDialog(true);
    }
  }, [searchParams]);

  const handleCloseCreate = () => {
    setShowCreateDialog(false);
    if (searchParams.get('action') === 'new-staff') {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('action');
      const q = p.toString();
      window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}&limit=50`);
      const data = await res.json();
      if (data.success) setUsers(data.data.items);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 250);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const handleToggleStatus = async (user: StaffUser) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    await fetch(`/api/users/${user._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchUsers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
            id="staff-search"
          />
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} id="create-staff-btn">
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          New Staff
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user._id} className="hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => setSelectedUser(user)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{user.name}</p>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-xs">
                      {user.role}
                    </Badge>
                    <Badge variant={user.status === 'active' ? 'outline' : 'destructive'} className="text-xs">
                      {user.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                  {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                </div>
              </CardContent>
            </Card>
          ))}
          {users.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No staff found.</div>
          )}
        </div>
      )}

      <CreateStaffDialog open={showCreateDialog} onClose={() => { handleCloseCreate(); fetchUsers(); }} />
      {selectedUser && (
        <EditStaffDialog
          user={selectedUser}
          onClose={() => { setSelectedUser(null); fetchUsers(); }}
          onToggleStatus={() => handleToggleStatus(selectedUser)}
        />
      )}
    </div>
  );
}

// ── Create Staff Dialog ───────────────────────────────────────

function CreateStaffDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'agent' as 'agent' | 'admin' });
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_AGENT_PERMISSIONS as unknown as string[]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, permissions }),
      });
      const data = await res.json();
      if (data.success) {
        onClose();
      } else {
        setError(data.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Create Staff Account</DialogTitle>
          <DialogDescription>Add a new admin or agent to the system.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4 py-2 pr-1">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="create-name">Full Name</Label>
            <Input id="create-name" value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-email">Email</Label>
            <Input id="create-email" type="email" value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-password">Password</Label>
            <Input id="create-password" type="password" value={formData.password} onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-role">Role</Label>
            <Select value={formData.role} onValueChange={(v) => setFormData((f) => ({ ...f, role: v as 'agent' | 'admin' }))}>
              <SelectTrigger id="create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.role === 'agent' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Permissions
              </Label>
              <div className="space-y-1.5 border border-border rounded-md p-3">
                {ADMIN_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="accent-primary"
                    />
                    <span className="text-xs font-mono">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 pt-3 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose} id="cancel-create-staff-btn">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading} id="submit-create-staff-btn">
            {isLoading ? 'Creating...' : 'Create Staff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Staff Dialog ─────────────────────────────────────────

function EditStaffDialog({
  user,
  onClose,
  onToggleStatus,
}: {
  user: StaffUser;
  onClose: () => void;
  onToggleStatus: () => void;
}) {
  const [permissions, setPermissions] = useState<string[]>(user.permissions);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const savePermissions = async () => {
    setIsSaving(true);
    await fetch(`/api/users/${user._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions }),
    });
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{user.name}</DialogTitle>
          <DialogDescription>{user.email} · {user.role}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between p-3 border border-border rounded-md">
              <div>
                <p className="text-sm font-medium">Account Status</p>
                <p className="text-xs text-muted-foreground">
                  {user.status === 'active' ? 'Account is active' : 'Account is disabled'}
                </p>
              </div>
              <Switch
                checked={user.status === 'active'}
                onCheckedChange={onToggleStatus}
                id={`status-toggle-${user._id}`}
              />
            </div>

            {user.role === 'agent' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Permissions
                </Label>
                <div className="space-y-1.5 border border-border rounded-md p-3">
                  {ADMIN_PERMISSIONS.map((perm) => (
                    <label key={perm} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="accent-primary"
                      />
                      <span className="text-xs font-mono">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {user.role === 'agent' && (
            <Button onClick={savePermissions} disabled={isSaving} id={`save-permissions-${user._id}`}>
              {saved ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Saved!</> : isSaving ? 'Saving...' : 'Save Permissions'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Students tab ─────────────────────────────────────────────

interface Student {
  _id: string;
  name: string;
  mobileNumber: string;
  grade: string;
  registrationDate: string;
  status: string;
}

function StudentsTab() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      if (gradeFilter) params.set('grade', gradeFilter);
      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();
      if (data.success) setStudents(data.data.items);
    } finally {
      setIsLoading(false);
    }
  }, [search, gradeFilter]);

  useEffect(() => {
    const t = setTimeout(fetchStudents, 250);
    return () => clearTimeout(t);
  }, [fetchStudents]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
            id="student-search"
          />
        </div>
        <Select value={gradeFilter} onValueChange={(val) => setGradeFilter(val ?? '')}>
          <SelectTrigger className="w-36 h-8 text-sm" id="student-grade-filter">
            <SelectValue placeholder="All grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All grades</SelectItem>
            {GRADE_OPTIONS.map((g) => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} id="create-student-btn">
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          New Student
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <Card key={student._id} className="hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => setSelectedStudent(student)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{student.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {GRADE_OPTIONS.find((g) => g.value === student.grade)?.label ?? student.grade}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{student.mobileNumber}</p>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  Reg: {new Date(student.registrationDate).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
          {students.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No students found.</div>
          )}
        </div>
      )}

      <CreateStudentDialog open={showCreateDialog} onClose={() => { handleCloseCreate(); fetchStudents(); }} />
      {selectedStudent && (
        <StudentProfileDialog student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}

function CreateStudentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({ name: '', mobileNumber: '', grade: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.grade) { setError('Please select a grade.'); return; }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        onClose();
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
          <DialogTitle>Register Student</DialogTitle>
          <DialogDescription>Create a new student record. Attribution logic runs automatically.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4 py-2 pr-1">
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="new-student-name">Full Name</Label>
            <Input id="new-student-name" value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-student-mobile">Mobile Number</Label>
            <Input id="new-student-mobile" value={formData.mobileNumber} onChange={(e) => setFormData((f) => ({ ...f, mobileNumber: e.target.value }))} placeholder="07X XXXX XXX" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-student-grade">Grade</Label>
            <Select value={formData.grade} onValueChange={(v) => setFormData((f) => ({ ...f, grade: v ?? '' }))}>
              <SelectTrigger id="new-student-grade"><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-3 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading} id="submit-create-student-btn">
            {isLoading ? 'Creating...' : 'Register Student'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StudentProfileDialog({ student, onClose }: { student: Student; onClose: () => void }) {
  const [profile, setProfile] = useState<{ callRecords: unknown[]; payments: unknown[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${student._id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProfile(d.data);
      })
      .finally(() => setIsLoading(false));
  }, [student._id]);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>{student.name}</DialogTitle>
          <DialogDescription>
            Mobile: {student.mobileNumber} · Grade: {GRADE_OPTIONS.find((g) => g.value === student.grade)?.label ?? student.grade}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="calls" className="flex-1 min-h-0 flex flex-col mt-2">
          <TabsList className="shrink-0">
            <TabsTrigger value="calls">Call History</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
          </TabsList>
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar py-2 pr-1">
            {isLoading ? (
              <div className="space-y-2 py-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
              </div>
            ) : (
              <>
                <TabsContent value="calls" className="space-y-2 mt-2">
                  {(profile?.callRecords as any[])?.length ? (
                    (profile!.callRecords as any[]).map((cr: any) => (
                      <div key={cr._id} className="p-3 border border-border/70 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{cr.outcome}</p>
                          <p className="text-muted-foreground">{cr.month} · {cr.agent?.name ?? 'Agent'}</p>
                          {cr.notes && <p className="text-muted-foreground mt-0.5 italic">{cr.notes}</p>}
                        </div>
                        <span className="text-muted-foreground">{new Date(cr.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">No call records found.</p>
                  )}
                </TabsContent>
                <TabsContent value="payments" className="space-y-2 mt-2">
                  {(profile?.payments as any[])?.length ? (
                    (profile!.payments as any[]).map((p: any) => (
                      <div key={p._id} className="p-3 border border-border/70 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-semibold">Rs. {p.amount.toLocaleString()}</p>
                          <p className="text-muted-foreground">Month: {p.paymentMonth}</p>
                          {p.attributedAgent && <p className="text-primary mt-0.5">Attributed: {p.attributedAgent.name}</p>}
                        </div>
                        <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">No payment records found.</p>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
        <DialogFooter className="pt-2 border-t border-border/60 shrink-0">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────

function UsersContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const tabParam = searchParams.get('tab');
  const initialTab = action === 'new-student' || tabParam === 'students' ? 'students' : 'staff';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const act = searchParams.get('action');
    const tab = searchParams.get('tab');
    if (act === 'new-student' || tab === 'students') {
      setActiveTab('students');
    } else if (act === 'new-staff' || tab === 'staff') {
      setActiveTab('staff');
    }
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <PageHeader title="Users" description="Manage staff accounts and student records" />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="staff" id="staff-tab">Staff</TabsTrigger>
          <TabsTrigger value="students" id="students-tab">Students</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="mt-4">
          <StaffTab />
        </TabsContent>
        <TabsContent value="students" className="mt-4">
          <StudentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <UsersContent />
    </Suspense>
  );
}
