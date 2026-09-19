'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, UserPlus, AlertCircle, Edit, Trash2, Shield,
  Headphones, CheckCircle2, KeyRound, Wallet
} from 'lucide-react';
import { ADMIN_PERMISSIONS, DEFAULT_AGENT_PERMISSIONS, PermissionKey } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

interface AgentUser {
  _id: string;
  name: string;
  email: string;
  role: 'agent';
  status: 'active' | 'disabled';
  permissions: string[];
  createdAt: string;
  remainingBalance?: number;
  pendingClaimAmount?: number;
}

function AgentsManagementContent() {
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [totalRemainingPayout, setTotalRemainingPayout] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentUser | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<AgentUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'new-agent') {
      setShowCreateDialog(true);
    }
  }, [searchParams]);

  const handleCloseCreate = () => {
    setShowCreateDialog(false);
    if (searchParams.get('action') === 'new-agent') {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('action');
      const q = p.toString();
      window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);
    }
  };

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        role: 'agent',
        page: String(page),
        limit: '25',
      });
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAgents(data.data.items || []);
        setTotalPages(data.data.totalPages || 1);
        setTotalCount(data.data.total || 0);
        if (typeof data.data.totalRemainingPayout === 'number') {
          setTotalRemainingPayout(data.data.totalRemainingPayout);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchAgents, 250);
    return () => clearTimeout(t);
  }, [fetchAgents]);

  const handleToggleStatus = async (agent: AgentUser) => {
    const newStatus = agent.status === 'active' ? 'disabled' : 'active';
    try {
      await fetch(`/api/users/${agent._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchAgents();
    } catch {
      // ignore
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAgent) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${deletingAgent._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeletingAgent(null);
        fetchAgents();
      } else {
        alert(data.error || 'Failed to delete agent.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Agents"
          description={`Manage agents, assign granular access permissions, and track status (${totalCount} total agents)`}
        />
        <Button onClick={() => setShowCreateDialog(true)} id="create-agent-btn" className="self-start sm:self-center">
          <UserPlus className="h-4 w-4 mr-2" />
          New Agent
        </Button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Agents</p>
            <h4 className="text-xl font-bold tracking-tight">{totalCount}</h4>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Remaining Payable</p>
            <h4 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              Rs. {totalRemainingPayout.toLocaleString()}
            </h4>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9"
            id="agent-search-input"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val ?? 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36 h-9 text-xs" id="agent-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>

        {(search || statusFilter !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
              setPage(1);
            }}
            className="text-xs h-9"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Agents Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg w-full" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center">
          <Headphones className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-medium">No agents found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria.'
              : 'Add your first agent to start logging calls and assigning leads.'}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
            className="mt-4"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Create Agent
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Agent</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Permissions</TableHead>
                <TableHead className="font-semibold text-right">Remaining Payment</TableHead>
                <TableHead className="font-semibold">Joined</TableHead>
                <TableHead className="text-right font-semibold pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent._id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[180px] sm:max-w-xs">{agent.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {agent.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={agent.status === 'active' ? 'outline' : 'destructive'}
                      className="text-[11px] capitalize cursor-pointer select-none"
                      onClick={() => handleToggleStatus(agent)}
                      title="Click to toggle status"
                    >
                      {agent.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      {agent.permissions?.length || 0} granted
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end justify-center">
                      <span className={`font-mono text-sm ${(agent.remainingBalance ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground'}`}>
                        Rs. {(agent.remainingBalance ?? 0).toLocaleString()}
                      </span>
                      {agent.pendingClaimAmount && agent.pendingClaimAmount > 0 ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          Rs. {agent.pendingClaimAmount.toLocaleString()} claim pending
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Edit Agent & Permissions"
                        onClick={() => setEditingAgent(agent)}
                      >
                        <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        title="Delete Agent"
                        onClick={() => setDeletingAgent(agent)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
              pageSize={25}
              onPageChange={setPage}
              itemName="agents"
            />
          </div>
        </div>
      )}

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        open={showCreateDialog}
        onClose={() => {
          handleCloseCreate();
          fetchAgents();
        }}
      />

      {/* Edit Agent Dialog - WITH PROPER SCROLLING */}
      {editingAgent && (
        <EditAgentDialog
          agent={editingAgent}
          onClose={() => {
            setEditingAgent(null);
            fetchAgents();
          }}
        />
      )}

      {/* Delete Agent Confirmation */}
      <AlertDialog
        open={Boolean(deletingAgent)}
        onOpenChange={(open) => !open && setDeletingAgent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete agent{' '}
              <span className="font-semibold text-foreground">{deletingAgent?.name}</span> (
              {deletingAgent?.email})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Agent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Create Agent Dialog ────────────────────────────────────────────────

function CreateAgentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_AGENT_PERMISSIONS as unknown as string[]);
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
        body: JSON.stringify({ ...formData, role: 'agent', permissions }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({ name: '', email: '', password: '' });
        onClose();
      } else {
        setError(data.error || 'Failed to create agent.');
      }
    } catch {
      setError('An error occurred. Please try again.');
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
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            Create Agent
          </DialogTitle>
          <DialogDescription>
            Add a new agent account and configure their system access permissions.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-agent-name">Agent Full Name *</Label>
            <Input
              id="new-agent-name"
              placeholder="e.g. Nimal Fernando"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-agent-email">Email Address *</Label>
            <Input
              id="new-agent-email"
              type="email"
              placeholder="agent@newgen.lk"
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-agent-password">Initial Password *</Label>
            <Input
              id="new-agent-password"
              type="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
            />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 font-medium">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Access Permissions ({permissions.length} selected)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() =>
                  setPermissions(
                    permissions.length === ADMIN_PERMISSIONS.length
                      ? (DEFAULT_AGENT_PERMISSIONS as unknown as string[])
                      : [...(ADMIN_PERMISSIONS as unknown as string[])]
                  )
                }
              >
                {permissions.length === ADMIN_PERMISSIONS.length ? 'Reset to Default' : 'Select All'}
              </Button>
            </div>

            <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20 max-h-52 overflow-y-auto">
              {ADMIN_PERMISSIONS.map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-2.5 p-1 rounded hover:bg-muted/50 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="accent-primary h-4 w-4 rounded"
                  />
                  <span className="text-xs font-mono">{perm}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} id="confirm-create-agent">
            {isLoading ? 'Creating...' : 'Create Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Agent Dialog (FIXED SCROLLING) ────────────────────────────────

function EditAgentDialog({
  agent,
  onClose,
}: {
  agent: AgentUser;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: agent.name,
    email: agent.email,
    password: '',
    status: agent.status,
  });
  const [permissions, setPermissions] = useState<string[]>(agent.permissions || []);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required.');
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
        permissions,
      };
      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const res = await fetch(`/api/users/${agent._id}`, {
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
        setError(data.error || 'Failed to update agent.');
      }
    } catch {
      setError('Failed to update. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      {/* 
        CRITICAL FIX FOR SCROLLING:
        - max-h-[85vh]
        - flex flex-col
        - shrink-0 on Header and Footer
        - flex-1 min-h-0 overflow-y-auto on content container
      */}
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            Edit Agent: {agent.name}
          </DialogTitle>
          <DialogDescription>
            Update personal details, reset password, toggle active state, and configure permissions.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-3 pr-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-agent-name">Agent Name</Label>
            <Input
              id="edit-agent-name"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-agent-email">Email Address</Label>
            <Input
              id="edit-agent-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-agent-password" className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              Reset Password (leave empty to keep current)
            </Label>
            <Input
              id="edit-agent-password"
              type="password"
              placeholder="Enter new password if changing"
              value={formData.password}
              onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
            <div>
              <p className="text-sm font-medium">Account Status</p>
              <p className="text-xs text-muted-foreground">
                {formData.status === 'active'
                  ? 'Agent can login and access assigned features'
                  : 'Agent is disabled and cannot login'}
              </p>
            </div>
            <Switch
              checked={formData.status === 'active'}
              onCheckedChange={(checked) =>
                setFormData((f) => ({ ...f, status: checked ? 'active' : 'disabled' }))
              }
              id="edit-agent-status-toggle"
            />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 font-medium">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Granular Permissions ({permissions.length} active)
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setPermissions(DEFAULT_AGENT_PERMISSIONS as unknown as string[])}
                >
                  Default
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() =>
                    setPermissions(
                      permissions.length === ADMIN_PERMISSIONS.length
                        ? []
                        : [...(ADMIN_PERMISSIONS as unknown as string[])]
                    )
                  }
                >
                  {permissions.length === ADMIN_PERMISSIONS.length ? 'Clear All' : 'Select All'}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20 max-h-56 overflow-y-auto">
              {ADMIN_PERMISSIONS.map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-2.5 p-1 rounded hover:bg-muted/50 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="accent-primary h-4 w-4 rounded"
                  />
                  <span className="text-xs font-mono">{perm}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} id="save-agent-btn">
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

export default function AgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AgentsManagementContent />
    </Suspense>
  );
}
