import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/db/mongoose';
import { Student, PaymentRecord, ClaimRequest } from '@/lib/db/models';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AdminDashboardCharts } from '@/components/admin/AdminDashboardCharts';
import {
  getRegistrationsOverTime,
  getPaymentsOverTime,
  getAgentPerformanceReport,
} from '@/lib/services/report.service';
import { GRADE_OPTIONS } from '@/lib/types';
import {
  UserPlus, CreditCard, GraduationCap, Users, Trophy, ShieldCheck,
  TrendingUp, ArrowRight, DollarSign, Clock, CheckCircle2, PhoneCall, Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import { getCachedOrFetch } from '@/lib/cache/memCache';

async function getDashboardData() {
  return getCachedOrFetch('admin_dashboard_metrics', 30, async () => {
    await connectDB();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const startMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const startMonthStr = `${startMonthDate.getUTCFullYear()}-${String(startMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;
  const thisMonthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const [
    totalStudents,
    registrationsThisMonth,
    paymentsThisMonthAgg,
    pendingClaims,
    topAgents,
    registrationsTrend,
    paymentsTrend,
    mediumAgg,
    recentStudents,
  ] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ registrationDate: { $gte: monthStart, $lt: nextMonthStart } }),
    PaymentRecord.aggregate([
      { $match: { paymentMonth: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    ClaimRequest.countDocuments({ status: 'pending' }),
    getAgentPerformanceReport({ startMonth: thisMonthStr, endMonth: thisMonthStr }),
    getRegistrationsOverTime({ startMonth: startMonthStr }),
    getPaymentsOverTime({ startMonth: startMonthStr }),
    Student.aggregate([
      { $group: { _id: '$medium', count: { $sum: 1 } } },
    ]),
    Student.find().sort({ registrationDate: -1 }).limit(5).lean(),
  ]);

  const sinhalaCount = mediumAgg.find((m) => m._id === 'sinhala')?.count ?? 0;
  const englishCount = mediumAgg.find((m) => m._id === 'english')?.count ?? 0;
  const mediumDistribution = [
    {
      medium: 'sinhala',
      label: 'Sinhala Medium',
      count: sinhalaCount,
      fill: '#2563eb',
    },
    {
      medium: 'english',
      label: 'English Medium',
      count: englishCount,
      fill: '#10b981',
    },
  ];

  // If no agents have performance for this month yet, fall back to all-time so data isn't empty
  let agentsList = topAgents;
  let isAllTime = false;
  if (agentsList.length === 0) {
    agentsList = await getAgentPerformanceReport({});
    isAllTime = true;
  }

  // Sort agents strictly by Success Calls (registered students) descending
  const sortedBySuccessCalls = [...agentsList].sort((a, b) => {
    if (b.registrationMatches !== a.registrationMatches) {
      return b.registrationMatches - a.registrationMatches;
    }
    return b.totalPoints - a.totalPoints;
  });

  return {
    totalStudents,
    registrationsThisMonth,
    paymentsThisMonth: paymentsThisMonthAgg[0] ?? { total: 0, count: 0 },
    pendingClaims,
    topAgents: sortedBySuccessCalls.slice(0, 5),
    isAllTime,
    registrationsTrend: registrationsTrend.slice(-6),
    revenueTrend: paymentsTrend.slice(-6),
    mediumDistribution,
    recentStudents,
  };
  });
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') redirect('/agent/dashboard');

  const data = await getDashboardData();
  const getGradeLabel = (val: string) => GRADE_OPTIONS.find((g) => g.value === val)?.label ?? val;

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Executive Dashboard"
          description="High-level school metrics, fee collection progress, and agent team velocity"
        />
        <Badge variant="outline" className="self-start sm:self-center px-3 py-1 font-mono text-xs">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Badge>
      </div>

      {/* 2. Top Quick Links in Primary Color (Icon + Text) */}
      <div className="p-3.5 rounded-xl border border-primary/20 bg-muted/20 space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
          Quick Actions & Locations
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/students?action=new-student"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm' })}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Register Student
          </Link>

          <Link
            href="/admin/payments?action=new-payment"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm' })}
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Record Payment
          </Link>

          <Link
            href="/admin/claims"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm gap-1.5' })}
          >
            <Wallet className="h-3.5 w-3.5" />
            Loyalty Claims
            {data.pendingClaims > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4 rounded-full font-mono">
                {data.pendingClaims}
              </Badge>
            )}
          </Link>

          <Link
            href="/admin/students"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm' })}
          >
            <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
            Students Directory
          </Link>

          <Link
            href="/admin/agents"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm' })}
          >
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Agents
          </Link>

          <Link
            href="/admin/leaderboard"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm' })}
          >
            <Trophy className="h-3.5 w-3.5 mr-1.5" />
            Leaderboard
          </Link>

          <Link
            href="/admin/audits"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm' })}
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
            Audit Logs
          </Link>
        </div>
      </div>

      {/* 3. Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={data.totalStudents.toLocaleString()}
          description="Active student enrollments"
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <StatCard
          title="New This Month"
          value={data.registrationsThisMonth}
          description="Verified new registrations"
          icon={<UserPlus className="h-4 w-4" />}
          badge={<Badge variant="secondary" className="text-[10px]">Active</Badge>}
        />
        <StatCard
          title="Revenue (This Month)"
          value={`Rs. ${(data.paymentsThisMonth.total ?? 0).toLocaleString()}`}
          description={`${data.paymentsThisMonth.count ?? 0} fee transaction(s)`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          title="Pending Claims"
          value={data.pendingClaims}
          description="Awaiting admin approval"
          icon={<Clock className="h-4 w-4" />}
          badge={
            data.pendingClaims > 0 ? (
              <Badge variant="destructive" className="text-[10px]">Action Needed</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">All Clear</Badge>
            )
          }
        />
      </div>

      {/* 4. Charts: Area Chart (Revenue) + Bar Chart (Enrollments) + Pie Chart (Medium Distribution) */}
      <AdminDashboardCharts
        revenueTrend={data.revenueTrend}
        registrationTrend={data.registrationsTrend}
        mediumDistribution={data.mediumDistribution}
      />

      {/* 5. Bottom Two Columns: Top Agents & Recent Student Enrollments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Agents */}
        <Card className="bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top Performing Agents
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Ranked by verified student registrations (Success Calls) {data.isAllTime ? '• All Time' : '• This Month'}
              </CardDescription>
            </div>
            <Link
              href="/admin/leaderboard"
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-xs h-7 gap-1' })}
            >
              Full Board
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {data.topAgents.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No agent call activity recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.topAgents.map((agent: any, index: number) => {
                  const isFirst = index === 0;
                  return (
                    <div
                      key={agent.agentEmail}
                      className="p-2.5 rounded-lg border bg-muted/15 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isFirst
                              ? 'bg-amber-500 text-white'
                              : index === 1
                              ? 'bg-slate-300 text-slate-800'
                              : index === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{agent.agentName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{agent.agentEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="default" className="font-mono text-xs gap-1 font-semibold">
                          <PhoneCall className="h-3 w-3" />
                          {agent.registrationMatches} Success Calls
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {agent.totalPoints} pts
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Registered Students */}
        <Card className="bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Latest Student Enrollments
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Recently enrolled students into the institution
              </CardDescription>
            </div>
            <Link
              href="/admin/students"
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-xs h-7 gap-1' })}
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {data.recentStudents.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No students enrolled yet.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                      <TableHead className="py-2 font-semibold">Student</TableHead>
                      <TableHead className="py-2 font-semibold">Grade</TableHead>
                      <TableHead className="py-2 font-semibold">Medium</TableHead>
                      <TableHead className="py-2 text-right font-semibold">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentStudents.map((student: any) => (
                      <TableRow key={String(student._id)} className="hover:bg-muted/20 text-xs">
                        <TableCell className="py-2 font-medium">
                          <p className="truncate max-w-[120px] sm:max-w-[160px] text-foreground font-semibold">
                            {student.name}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">{student.mobileNumber}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[10px]">
                            {getGradeLabel(student.grade)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {student.medium === 'english' ? 'English' : 'Sinhala'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right text-muted-foreground text-[11px]">
                          {format(new Date(student.registrationDate), 'MMM d')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
