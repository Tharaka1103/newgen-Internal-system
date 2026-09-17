'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Compass,
  GraduationCap,
  Headphones,
  PhoneCall,
  CreditCard,
  Trophy,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface TourStep {
  step: number;
  title: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  keyPoints: string[];
  link?: {
    href: string;
    label: string;
  };
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: 'Welcome to Newgen Internal System',
    tagline: 'Streamlined telemarketing, student management & automated attributions',
    icon: Sparkles,
    description:
      'This system is specifically built to unify student enrollments, call center operations, fee payments, and automated commission tracking in one clean platform.',
    keyPoints: [
      'Role-based access separating Administrator control from Agent portals',
      'Instant mobile-number matching linking telemarketing calls to fee payments',
      'Automated commission points and live leaderboards for staff motivation',
    ],
  },
  {
    step: 2,
    title: 'Student Directory (Grade 2 to A/Level)',
    tagline: 'Unified student profiles with complete interaction history',
    icon: GraduationCap,
    description:
      'Manage students across all grade levels starting from Grade 2 up to A/Level. Each student record aggregates their full call timeline and payment transactions.',
    keyPoints: [
      'Register students with mobile number and academic grade',
      'Click "View" on any student to inspect logged calls and verified payments',
      'Filter directory instantly by specific grades (Grade 2, 3, 4 ... A/L)',
      'Edit student details or delete records with safety confirmations',
    ],
    link: {
      href: '/admin/students',
      label: 'Open Student Directory',
    },
  },
  {
    step: 3,
    title: 'Telemarketing Agents & Permissions',
    tagline: 'Manage agents, assign custom permissions, and track status',
    icon: Headphones,
    description:
      'Telemarketing agents call prospective students and parents. Administrators have complete control over agent accounts and access levels.',
    keyPoints: [
      'Create agent accounts with secure credentials',
      'Granular permissions: choose exactly what each agent can view or edit',
      'Smoothly scrollable editor to customize all 20+ permissions',
      'One-click status toggle to activate or temporarily disable agent accounts',
    ],
    link: {
      href: '/admin/agents',
      label: 'Open Agents Page',
    },
  },
  {
    step: 4,
    title: 'Call Records & Automatic Attribution',
    tagline: 'How agent efforts turn into attributed commissions',
    icon: PhoneCall,
    description:
      'Agents log each call outcome (Interested, Call Back, etc.). When a parent or student pays fees, the system matches the student mobile number to recent calls.',
    keyPoints: [
      'Agents log calls quickly with mobile number, grade, and outcome',
      'Smart Attribution Engine checks 30-day interaction windows',
      'Attributed payments automatically award loyalty points to the agent',
      'Prevents commission disputes with transparent attribution criteria',
    ],
    link: {
      href: '/agent/call-records',
      label: 'View Call Records',
    },
  },
  {
    step: 5,
    title: 'Payments & Financial Tracking',
    tagline: 'Record tuition fees, verify attribution, and process reward claims',
    icon: CreditCard,
    description:
      'Administrators record student payments and verify which agent brought the enrollment. Agents can claim their earned reward points for cash payouts.',
    keyPoints: [
      'Record student fee payments with month and amount',
      'Real-time attribution badge showing which agent earned the credit',
      'Agent points ledger tracking earned vs claimed commission points',
      'Admin approval workflow for agent reward claims',
    ],
    link: {
      href: '/admin/payments',
      label: 'Open Payments Page',
    },
  },
  {
    step: 6,
    title: 'Live Leaderboards & Analytics',
    tagline: 'Visual insights, conversion rates, and friendly competition',
    icon: Trophy,
    description:
      'Keep your telemarketing team motivated with real-time rankings and comprehensive conversion reports.',
    keyPoints: [
      'Top agents ranked by total student registrations and payments',
      'Conversion reports showing which grades have the highest interest',
      'Export financial and operational reports with date range filtering',
    ],
    link: {
      href: '/admin/leaderboard',
      label: 'View Leaderboard',
    },
  },
  {
    step: 7,
    title: 'System Security & Activity Logs',
    tagline: 'Complete auditability and active session control',
    icon: ShieldCheck,
    description:
      'Every administrative action, permission change, and login is recorded in an immutable audit trail for full transparency.',
    keyPoints: [
      'Detailed audit log tracking who performed each action and when',
      'View all active user sessions with IP addresses and devices',
      'Instantly revoke suspicious or inactive login sessions',
      'Dedicated administrator management page for system security',
    ],
    link: {
      href: '/admin/audits',
      label: 'View Activity Log',
    },
  },
];

interface SystemTourModalProps {
  open: boolean;
  onClose: () => void;
}

export function SystemTourModal({ open, onClose }: SystemTourModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = TOUR_STEPS[currentStepIndex];
  const StepIcon = step.icon;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    setCurrentStepIndex(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        {/* Header with step progress indicator */}
        <DialogHeader className="shrink-0 pb-3 border-b">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge variant="outline" className="text-xs font-mono px-2 py-0.5">
              Step {step.step} of {TOUR_STEPS.length}
            </Badge>
            {/* Progress Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((s, idx) => (
                <button
                  key={s.step}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-muted hover:bg-muted-foreground/40'
                  }`}
                  aria-label={`Jump to step ${s.step}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <StepIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {step.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {step.tagline}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4 pr-1">
          <p className="text-sm text-foreground/90 leading-relaxed">
            {step.description}
          </p>

          <div className="space-y-2.5 bg-muted/30 border rounded-lg p-4">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Key Features & How It Works:
            </h4>
            <ul className="space-y-2">
              {step.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {step.link && (
            <div className="pt-1">
              <Link href={step.link.href} onClick={handleClose} className="inline-block">
                <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
                  <span>{step.link.label}</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <DialogFooter className="pt-3 border-t shrink-0 flex items-center justify-between sm:justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip Tour
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={isFirst}
              className="text-xs h-9"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="text-xs h-9 min-w-[90px]"
              id="tour-next-btn"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Got It!
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
