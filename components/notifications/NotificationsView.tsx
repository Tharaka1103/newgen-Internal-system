'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Search,
  CheckCheck,
  Trash2,
  Mail,
  MailOpen,
  ArrowRight,
  GraduationCap,
  CreditCard,
  Wallet,
  PhoneCall,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationItem {
  _id: string;
  recipient: string;
  type: string;
  title: string;
  message: string;
  referenceId?: string;
  entityType?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsViewProps {
  role: 'admin' | 'agent';
}

export function NotificationsView({ role }: NotificationsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=50');
      const data = await res.json();
      if (data.success) {
        const items: NotificationItem[] = data.data.items || [];
        setNotifications(items);

        // If an initial id is passed from URL, ensure it is selected
        if (initialId && items.some((n) => n._id === initialId)) {
          setSelectedId(initialId);
        } else if (!selectedId && items.length > 0) {
          // Default to first item on larger screens
          setSelectedId(items[0]._id);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [initialId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark notification as read
  const handleMarkRead = async (id: string, readStatus: boolean) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: readStatus }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: readStatus } : n))
      );
    } catch {
      // ignore
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  // Select notification handler
  const handleSelectNotification = (n: NotificationItem) => {
    setSelectedId(n._id);
    const p = new URLSearchParams(searchParams.toString());
    p.set('id', n._id);
    router.replace(`?${p.toString()}`, { scroll: false });

    // Automatically mark read on selection if unread
    if (!n.read) {
      handleMarkRead(n._id, true);
    }
  };

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread' && n.read) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
      }
      return true;
    });
  }, [notifications, filter, search]);

  const selectedNotification = useMemo(() => {
    return notifications.find((n) => n._id === selectedId) || null;
  }, [notifications, selectedId]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Icon helper
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'registration_attributed':
        return <GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'payment_attributed':
        return <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'claim_approved':
        return <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'claim_rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'call_record_edit_requested':
        return <PhoneCall className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'call_record_edit_approved':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'call_record_edit_rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  // Action CTA helper
  const renderNotificationAction = (n: NotificationItem) => {
    switch (n.type) {
      case 'call_record_edit_requested':
        if (role === 'admin') {
          return (
            <Link href="/admin/call-records/edit-requests">
              <Button size="sm" className="gap-1.5 text-xs">
                Review Edit Request
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          );
        }
        break;
      case 'call_record_edit_approved':
        if (role === 'agent') {
          return (
            <Link href="/agent/call-records">
              <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                Open Call Records
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          );
        }
        break;
      case 'claim_approved':
      case 'claim_rejected':
        return (
          <Link href={role === 'admin' ? '/admin/claims' : '/agent/claims'}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              View Claims
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        );
      case 'registration_attributed':
        return (
          <Link href={role === 'admin' ? '/admin/students' : '/agent/call-records'}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              {role === 'admin' ? 'View Students Directory' : 'View Call Records'}
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        );
      case 'payment_attributed':
        if (role === 'admin') {
          return (
            <Link href="/admin/students?tab=payments">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                View Payments
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          );
        }
        break;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Notifications"
          description={`Stay informed with alerts, attributions, and system updates (${unreadCount} unread)`}
        />
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs h-9 gap-1.5 self-start sm:self-center"
          >
            <CheckCheck className="h-4 w-4 text-primary" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Master-Detail Split Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-14rem)] min-h-[500px]">
        {/* Left Column: Notification List (5 cols) */}
        <div className="md:col-span-5 lg:col-span-5 flex flex-col border rounded-xl bg-card overflow-hidden">
          {/* Header & Filter Bar */}
          <div className="p-3 border-b space-y-2.5 bg-muted/20 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Tabs
                value={filter}
                onValueChange={(val) => setFilter(val as 'all' | 'unread')}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 h-7 text-xs w-full">
                  <TabsTrigger value="all" className="text-xs">
                    All ({notifications.length})
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs">
                    Unread ({unreadCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* List Scroll Area */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="p-3 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No notifications</p>
                <p className="text-xs text-muted-foreground/80 mt-0.5">
                  {filter === 'unread' ? 'All caught up! No unread notifications.' : 'No alerts to display.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isSelected = n._id === selectedId;
                return (
                  <div
                    key={n._id}
                    onClick={() => handleSelectNotification(n)}
                    className={cn(
                      'p-3.5 cursor-pointer transition-colors relative flex items-start gap-3 select-none',
                      isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/40',
                      !n.read && !isSelected && 'bg-primary/5'
                    )}
                  >
                    <div className="mt-0.5 shrink-0 rounded-lg p-1.5 bg-muted/60 border">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <p className={cn('text-xs truncate font-semibold', !n.read ? 'text-foreground font-bold' : 'text-foreground/90')}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: false })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 self-center" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Notification Detail (7 cols) */}
        <div className="md:col-span-7 lg:col-span-7 flex flex-col border rounded-xl bg-card overflow-hidden">
          {selectedNotification ? (
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="p-4 border-b bg-muted/20 shrink-0 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl border bg-background shrink-0 mt-0.5 shadow-sm">
                    {getNotificationIcon(selectedNotification.type)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground leading-snug">
                      {selectedNotification.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>{format(new Date(selectedNotification.createdAt), 'PPPP p')}</span>
                      <span>•</span>
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider">
                        {selectedNotification.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Mark as read/unread toggle */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => handleMarkRead(selectedNotification._id, !selectedNotification.read)}
                    title={selectedNotification.read ? 'Mark as unread' : 'Mark as read'}
                  >
                    {selectedNotification.read ? (
                      <>
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Mark Unread</span>
                      </>
                    ) : (
                      <>
                        <MailOpen className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden sm:inline">Mark Read</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Detail Body Content */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="p-4 rounded-xl border bg-muted/30 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {selectedNotification.message}
                </div>

                {/* Optional Action CTA */}
                {renderNotificationAction(selectedNotification) && (
                  <div className="pt-2">
                    {renderNotificationAction(selectedNotification)}
                  </div>
                )}

                {/* Reference Details if available */}
                {(selectedNotification.referenceId || selectedNotification.entityType) && (
                  <div className="border-t pt-4 space-y-2 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">Metadata Reference</p>
                    <div className="grid grid-cols-2 gap-2 bg-muted/20 p-3 rounded-lg border font-mono">
                      <div>
                        <span className="text-muted-foreground">Entity: </span>
                        <span>{selectedNotification.entityType || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reference ID: </span>
                        <span className="truncate">{selectedNotification.referenceId ? String(selectedNotification.referenceId) : '—'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 opacity-40 text-primary" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">No Notification Selected</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Select an alert from the list on the left to read its full message and take relevant actions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
