'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Users, GraduationCap, ArrowRight, Loader2, Command } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SearchResultItem {
  id: string;
  label: string;
  href: string;
  description?: string;
  category: 'Pages' | 'Students' | 'Staff';
}

const STATIC_PAGES: Array<Omit<SearchResultItem, 'category'> & { category: 'Pages' }> = [
  { id: 'page-admin-dash', label: 'Admin Dashboard', href: '/admin/dashboard', description: 'Overview and core metrics', category: 'Pages' },
  { id: 'page-students', label: 'Student Directory', href: '/admin/students', description: 'Students from Grade 2 to A/L', category: 'Pages' },
  { id: 'page-agents', label: 'Agents Management', href: '/admin/agents', description: 'Telemarketers & call center agents', category: 'Pages' },
  { id: 'page-admins', label: 'Administrators', href: '/admin/admins', description: 'System administrative accounts', category: 'Pages' },
  { id: 'page-payments', label: 'Payments & Revenue', href: '/admin/payments', description: 'Student payments & verification', category: 'Pages' },
  { id: 'page-reports', label: 'Reports & Analytics', href: '/admin/reports', description: 'Performance and commissions', category: 'Pages' },
  { id: 'page-leaderboard', label: 'Leaderboard', href: '/admin/leaderboard', description: 'Top ranking agents', category: 'Pages' },
  { id: 'page-audits', label: 'Audit Logs', href: '/admin/audits', description: 'System-wide activity logs', category: 'Pages' },
  { id: 'page-sessions', label: 'Active Sessions', href: '/admin/sessions', description: 'Device & login sessions', category: 'Pages' },
  { id: 'page-settings', label: 'Settings', href: '/admin/settings', description: 'System configuration & targets', category: 'Pages' },
  { id: 'page-agent-dash', label: 'Agent Dashboard', href: '/agent/dashboard', description: 'My performance overview', category: 'Pages' },
  { id: 'page-agent-calls', label: 'Call Records', href: '/agent/call-records', description: 'Student calls & notes', category: 'Pages' },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut listener (Ctrl+K or ⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // When modal opens, focus input
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      // Default recommended pages
      setResults(STATIC_PAGES.slice(0, 6));
      setSelectedIndex(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query.toLowerCase().trim();

    const timer = setTimeout(async () => {
      // Filter pages
      const matchedPages: SearchResultItem[] = STATIC_PAGES.filter(
        (p) => p.label.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      );

      let fetchedStudents: SearchResultItem[] = [];
      let fetchedUsers: SearchResultItem[] = [];

      try {
        const [studentsRes, usersRes] = await Promise.all([
          fetch(`/api/students?search=${encodeURIComponent(q)}&limit=5`),
          fetch(`/api/users?search=${encodeURIComponent(q)}&limit=5`),
        ]);

        if (studentsRes.ok) {
          const sData = await studentsRes.json();
          if (sData.data?.items) {
            fetchedStudents = sData.data.items.map((s: any) => ({
              id: `student-${s._id}`,
              label: s.name,
              href: `/admin/students?search=${encodeURIComponent(s.mobileNumber)}`,
              description: `Mobile: ${s.mobileNumber} · Grade: ${s.grade}`,
              category: 'Students' as const,
            }));
          }
        }

        if (usersRes.ok) {
          const uData = await usersRes.json();
          if (uData.data?.items) {
            fetchedUsers = uData.data.items.map((u: any) => ({
              id: `user-${u._id}`,
              label: u.name,
              href: u.role === 'admin'
                ? `/admin/admins?search=${encodeURIComponent(u.email)}`
                : `/admin/agents?search=${encodeURIComponent(u.email)}`,
              description: `${u.email} · ${u.role}`,
              category: 'Staff' as const,
            }));
          }
        }
      } catch {
        // network error tolerated
      }

      const combined = [...matchedPages, ...fetchedStudents, ...fetchedUsers];
      setResults(combined);
      setSelectedIndex(0);
      setIsLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Navigate
  const handleSelect = (item: SearchResultItem) => {
    setOpen(false);
    router.push(item.href);
  };

  // Keyboard navigation inside input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Students':
        return <GraduationCap className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'Staff':
        return <Users className="h-4 w-4 text-blue-500 shrink-0" />;
      default:
        return <FileText className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  return (
    <>
      {/* Trigger Button styled as a modern search bar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            setQuery(e.key);
            setOpen(true);
          }
        }}
        className="flex items-center gap-2.5 h-9 w-60 md:w-72 px-3 rounded-xl bg-muted/60 hover:bg-muted border border-border/60 hover:border-border text-muted-foreground hover:text-foreground text-xs font-normal transition-all duration-150 shadow-sm cursor-pointer select-none group"
        aria-label="Open search dialog"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="flex-1 text-left truncate">Search anything...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium font-mono text-muted-foreground bg-background/80 border border-border/80 rounded-md shadow-2xs">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      {/* Full Command Palette Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-xl p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-popover top-[25%] translate-y-0"
          showCloseButton={false}
          aria-label="Search"
        >
          <DialogTitle className="sr-only">Global Search</DialogTitle>

          {/* Search Input Bar inside Dialog */}
          <div className="flex items-center px-3.5 py-3 border-b border-border/80 gap-2.5 bg-background">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, students, staff, actions..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none focus:ring-0"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
            {query && !isLoading && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Clear query"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="text-[10px] text-muted-foreground/80 font-mono px-1.5 py-0.5 rounded border border-border bg-muted/50 select-none">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <ScrollArea className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 && !isLoading && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No results found for &ldquo;<span className="text-foreground font-medium">{query}</span>&rdquo;
              </div>
            )}

            {results.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={cn(
                  'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors select-none',
                  selectedIndex === idx
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn(
                    'p-1.5 rounded-lg shrink-0',
                    selectedIndex === idx ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate leading-none">{item.label}</p>
                    {item.description && (
                      <p
                        className={cn(
                          'text-xs truncate mt-1',
                          selectedIndex === idx ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-md uppercase font-semibold tracking-wider',
                      selectedIndex === idx
                        ? 'bg-primary-foreground/25 text-primary-foreground'
                        : 'bg-muted text-muted-foreground border border-border/60'
                    )}
                  >
                    {item.category}
                  </span>
                  <ArrowRight
                    className={cn(
                      'h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all',
                      selectedIndex === idx && 'opacity-100 translate-x-0'
                    )}
                  />
                </div>
              </div>
            ))}
          </ScrollArea>

          {/* Footer Navigation Hints */}
          <div className="flex items-center justify-between px-3.5 py-2 border-t border-border/80 text-[11px] text-muted-foreground bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-border bg-background text-[10px] font-mono">↑</kbd>
                <kbd className="px-1 py-0.5 rounded border border-border bg-background text-[10px] font-mono">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono">↵</kbd>
                to select
              </span>
            </div>
            <span>{results.length} results</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
