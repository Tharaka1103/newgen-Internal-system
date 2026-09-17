'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, UserPlus, AlertCircle, Edit, Trash2, ShieldCheck,
  CheckCircle2, KeyRound
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin';
  status: 'active' | 'disabled';
  createdAt: string;
}

function AdminsManagementContent() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        role: 'admin',
        page: String(page),
        limit: '25',
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAdmins(data.data.items || []);
        setTotalPages(data.data.totalPages || 1);
        setTotalCount(data.data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(fetchAdmins, 250);
    return () => clearTimeout(t);
  }, [fetchAdmins]);

  const handleDeleteConfirm = async () => {
    if (!deletingAdmin) return;
    if (deletingAdmin._id === currentUserId) {
      alert('You cannot delete your own admin account.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${deletingAdmin._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeletingAdmin(null);
        fetchAdmins();
      } else {
        alert(data.error || 'Failed to delete administrator.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="System Administrators"
          description={`Manage administrative accounts with full privileges and system access (${totalCount} total)`}
        />
        <Button onClick={() => setShowCreateDialog(true)} id="create-admin-btn" className="self-start sm:self-center">
          <UserPlus className="h-4 w-4 mr-2" />
          New Administrator
        </Button>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search admins by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9"
            id="admin-search-input"
          />
        </div>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setPage(1);
            }}
            className="text-xs h-9"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg w-full" />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-medium">No administrators found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {search ? 'Try a different search term.' : 'Add your first administrator account.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Administrator</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Joined</TableHead>
                <TableHead className="text-right font-semibold pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const isSelf = admin._id === currentUserId;
                return (
                  <TableRow key={admin._id} className="hover:bg-muted/20">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[180px] sm:max-w-xs">{admin.name}</span>
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                              You
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {admin.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="text-[11px]">
                        Admin
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={admin.status === 'active' ? 'outline' : 'destructive'}
                        className="text-[11px] capitalize"
                      >
                        {admin.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(admin.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit Administrator"
                          onClick={() => setEditingAdmin(admin)}
                        >
                          <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSelf}
                          className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                          title={isSelf ? 'Cannot delete your own account' : 'Delete Administrator'}
                          onClick={() => setDeletingAdmin(admin)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
              pageSize={25}
              onPageChange={setPage}
              itemName="administrators"
            />
          </div>
        </div>
      )}

      {/* Create Admin Dialog */}
      <CreateAdminDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          fetchAdmins();
        }}
      />

      {/* Edit Admin Dialog */}
      {editingAdmin && (
        <EditAdminDialog
          admin={editingAdmin}
          onClose={() => {
            setEditingAdmin(null);
            fetchAdmins();
          }}
        />
      )}

      {/* Delete Admin Confirmation */}
      <AlertDialog
        open={Boolean(deletingAdmin)}
        onOpenChange={(open) => !open && setDeletingAdmin(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Administrator Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete administrator{' '}
              <span className="font-semibold text-foreground">{deletingAdmin?.name}</span> (
              {deletingAdmin?.email})? All administrative privileges will be revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Administrator'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Create Admin Dialog ────────────────────────────────────────────────

function CreateAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'admin' }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({ name: '', email: '', password: '' });
        onClose();
      } else {
        setError(data.error || 'Failed to create administrator.');
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
            <ShieldCheck className="h-5 w-5 text-primary" />
            Create Administrator
          </DialogTitle>
          <DialogDescription>
            Grant full administrative control and management permissions.
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
            <Label htmlFor="create-admin-name">Full Name *</Label>
            <Input
              id="create-admin-name"
              placeholder="e.g. Admin Manager"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-admin-email">Email Address *</Label>
            <Input
              id="create-admin-email"
              type="email"
              placeholder="admin@newgen.lk"
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-admin-password">Password *</Label>
            <Input
              id="create-admin-password"
              type="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} id="confirm-create-admin">
            {isLoading ? 'Creating...' : 'Create Admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Admin Dialog ──────────────────────────────────────────────────

function EditAdminDialog({
  admin,
  onClose,
}: {
  admin: AdminUser;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: admin.name,
    email: admin.email,
    password: '',
    status: admin.status,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (formData.password && formData.password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        name: formData.name,
        email: formData.email,
        status: formData.status,
      };
      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const res = await fetch(`/api/users/${admin._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(data.error || 'Failed to update administrator.');
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
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Edit Administrator
          </DialogTitle>
          <DialogDescription>Update admin credentials and account status.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-1">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-admin-name">Full Name</Label>
            <Input
              id="edit-admin-name"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-admin-email">Email Address</Label>
            <Input
              id="edit-admin-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-admin-password" className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              Reset Password (leave blank to keep current)
            </Label>
            <Input
              id="edit-admin-password"
              type="password"
              placeholder="Enter new password"
              value={formData.password}
              onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
            <div>
              <p className="text-sm font-medium">Account Status</p>
              <p className="text-xs text-muted-foreground">
                {formData.status === 'active' ? 'Active account' : 'Disabled account'}
              </p>
            </div>
            <Switch
              checked={formData.status === 'active'}
              onCheckedChange={(checked) =>
                setFormData((f) => ({ ...f, status: checked ? 'active' : 'disabled' }))
              }
              id="edit-admin-status-toggle"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} id="save-admin-btn">
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-500" />
                Saved!
              </>
            ) : isSaving ? (
              'Saving...'
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AdminsManagementContent />
    </Suspense>
  );
}
