'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Headphones, CheckCircle2, KeyRound, Wallet, Eye, Clock,
  ArrowDownLeft, ArrowUpRight, Check, FileText
} from 'lucide-react';
import { ADMIN_PERMISSIONS, DEFAULT_AGENT_PERMISSIONS, PermissionKey } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
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
  const router = useRouter();
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
  const [viewingAgent, setViewingAgent] = useState<AgentUser | null>(null);
  const [payoutAgent, setPayoutAgent] = useState<AgentUser | null>(null);
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
                        className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                        title="View Full Agent Profile & Stats"
                        onClick={() => router.push(`/admin/agents/${agent._id}`)}
                        id={`view-agent-${agent._id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${(agent.remainingBalance ?? 0) > 0 ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40' : 'text-muted-foreground/30 cursor-not-allowed'}`}
                        title={(agent.remainingBalance ?? 0) > 0 ? `Pay Agent (Rs. ${(agent.remainingBalance ?? 0).toLocaleString()})` : 'No balance to pay'}
                        disabled={(agent.remainingBalance ?? 0) <= 0}
                        onClick={() => setPayoutAgent(agent)}
                      >
                        <Wallet className="h-4 w-4" />
                      </Button>
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

      {/* View Agent Dialog */}
      {viewingAgent && (
        <ViewAgentDialog
          agent={viewingAgent}
          onClose={() => setViewingAgent(null)}
          onOpenPayout={(ag) => {
            setViewingAgent(null);
            setPayoutAgent(ag);
          }}
        />
      )}

      {/* Manual Payout Dialog */}
      {payoutAgent && (
        <ManualPayoutDialog
          agent={payoutAgent}
          onClose={() => setPayoutAgent(null)}
          onSuccess={() => {
            fetchAgents();
            setPayoutAgent(null);
          }}
        />
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

// ── View Agent Dialog ──────────────────────────────────────────────────

interface ViewAgentDialogProps {
  agent: AgentUser;
  onClose: () => void;
  onOpenPayout: (agent: AgentUser) => void;
}

function ViewAgentDialog({ agent, onClose, onOpenPayout }: ViewAgentDialogProps) {
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'claims'>('overview');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/users/${agent._id}`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data.success) {
          setDetails(data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [agent._id]);

  const currentBalance = details?.remainingBalance ?? agent.remainingBalance ?? 0;
  const totalEarned = details?.totalEarned ?? 0;
  const totalPaid = details?.totalPaid ?? 0;
  const pendingClaims = details?.pendingClaimAmount ?? agent.pendingClaimAmount ?? 0;
  const callCount = details?.callRecordsCount ?? 0;
  const permissions: string[] = details?.permissions || agent.permissions || [];
  const recentLedger: any[] = details?.recentLedger || [];
  const recentClaims: any[] = details?.recentClaims || [];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 pb-3 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                {agent.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  {agent.name}
                  <Badge
                    variant={agent.status === 'active' ? 'outline' : 'destructive'}
                    className="text-[11px] capitalize"
                  >
                    {agent.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs flex items-center gap-3 mt-0.5">
                  <span>{agent.email}</span>
                  <span>•</span>
                  <span>Joined {formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}</span>
                </DialogDescription>
              </div>
            </div>

            {currentBalance > 0 && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                onClick={() => onOpenPayout({ ...agent, remainingBalance: currentBalance, pendingClaimAmount: pendingClaims })}
              >
                <Wallet className="h-4 w-4 mr-1.5" />
                Pay Agent
              </Button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-1">
            <Button
              variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setActiveTab('overview')}
            >
              Overview & Stats
            </Button>
            <Button
              variant={activeTab === 'ledger' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setActiveTab('ledger')}
            >
              Loyalty Ledger ({recentLedger.length})
            </Button>
            <Button
              variant={activeTab === 'claims' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setActiveTab('claims')}
            >
              Claims & Payouts ({recentClaims.length})
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-1 space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : activeTab === 'overview' ? (
            <>
              {/* Financial Balance Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    <span>Remaining Payable</span>
                    <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="mt-2">
                    <h4 className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      Rs. {currentBalance.toLocaleString()}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Net owed to agent</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-card/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Total Earned</span>
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-2">
                    <h4 className="text-xl font-bold font-mono">
                      Rs. {totalEarned.toLocaleString()}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Cumulative commissions</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-card/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Total Paid Out</span>
                    <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2">
                    <h4 className="text-xl font-bold font-mono">
                      Rs. {totalPaid.toLocaleString()}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Disbursed payouts</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-card/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Calls Logged</span>
                    <Headphones className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-2">
                    <h4 className="text-xl font-bold font-mono">
                      {callCount}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Total call records</p>
                  </div>
                </div>
              </div>

              {pendingClaims > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-xs font-medium">
                      Agent has <strong>Rs. {pendingClaims.toLocaleString()}</strong> in pending claim requests awaiting approval.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20 shrink-0"
                    onClick={() => onOpenPayout({ ...agent, remainingBalance: currentBalance, pendingClaimAmount: pendingClaims })}
                  >
                    Pay Now
                  </Button>
                </div>
              )}

              {/* System Permissions */}
              <div className="space-y-2 border rounded-xl p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-sm font-semibold">
                    <Shield className="h-4 w-4 text-primary" />
                    Granted Permissions ({permissions.length})
                  </Label>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {permissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No specific permissions granted.</p>
                  ) : (
                    permissions.map((perm) => (
                      <Badge key={perm} variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                        {perm}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : activeTab === 'ledger' ? (
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Loyalty Ledger Transactions
              </h5>
              {recentLedger.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center text-xs text-muted-foreground">
                  No ledger activity found for this agent.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden divide-y text-xs">
                  {recentLedger.map((item) => (
                    <div key={item._id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/20">
                      <div className="flex items-start gap-2.5">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${item.amount >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                          {item.amount >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.description || (item.type === 'earned' ? 'Loyalty Credit Earned' : 'Payout Disbursed')}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold shrink-0">
                        <span className={item.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                          {item.amount >= 0 ? '+' : ''}Rs. {Math.abs(item.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Claims & Payout History
              </h5>
              {recentClaims.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center text-xs text-muted-foreground">
                  No claim requests or payouts recorded yet.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden divide-y text-xs">
                  {recentClaims.map((claim) => (
                    <div key={claim._id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/20">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={claim.status === 'paid' ? 'default' : claim.status === 'rejected' ? 'destructive' : 'outline'}
                            className="capitalize text-[10px]"
                          >
                            {claim.status}
                          </Badge>
                          <span className="font-semibold text-foreground">
                            Rs. {(claim.paidAmount || claim.requestedAmount).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {claim.bankDetails?.bankName} • {claim.bankDetails?.accountNumber} ({claim.bankDetails?.accountName})
                        </p>
                        {claim.adminNote && (
                          <p className="text-[10px] text-muted-foreground/90 italic">
                            Note: {claim.adminNote}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground shrink-0">
                        <p>{format(new Date(claim.createdAt), 'yyyy-MM-dd')}</p>
                        {claim.paidAt && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            Paid {formatDistanceToNow(new Date(claim.paidAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 shrink-0 flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {currentBalance > 0 && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onOpenPayout({ ...agent, remainingBalance: currentBalance, pendingClaimAmount: pendingClaims })}
            >
              <Wallet className="h-4 w-4 mr-1.5" />
              Pay Agent (Rs. {currentBalance.toLocaleString()})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Manual Payout Dialog ───────────────────────────────────────────────

interface ManualPayoutDialogProps {
  agent: AgentUser;
  onClose: () => void;
  onSuccess: () => void;
}

function ManualPayoutDialog({ agent, onClose, onSuccess }: ManualPayoutDialogProps) {
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
          {/* Current Balance Callout */}
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

          {agent.pendingClaimAmount && agent.pendingClaimAmount > 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Agent has a pending claim of <strong>Rs. {agent.pendingClaimAmount.toLocaleString()}</strong>.
              </span>
            </div>
          ) : null}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="payout-amount">Amount to Pay (Rs.) *</Label>
            <Input
              id="payout-amount"
              type="number"
              min={1}
              max={currentBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payout-note">Payment Note / Reference (optional)</Label>
            <Input
              id="payout-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bank Ref #99283 / Paid in cash"
            />
          </div>

          {/* Optional Bank Info Toggle */}
          <div className="border rounded-lg p-3 bg-muted/20 space-y-2.5">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setShowBankDetails(!showBankDetails)}
            >
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Bank / Disbursement Details (optional)
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
            * Recording this payment will immediately deduct the amount from the agent's remaining payable balance and notify them.
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
            id="confirm-payout-btn"
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
