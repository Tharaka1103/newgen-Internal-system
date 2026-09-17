import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import { CreditPoint, LoyaltyLedger, CallRecord, MonthlyTarget } from '@/lib/db/models';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AgentDashboardCharts } from '@/components/agent/AgentDashboardCharts';
import {
  PhoneCall, Wallet, Trophy, History, Award, Sparkles, Target, ArrowRight, Clock,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

async function getAgentDashboardData(agentId: string) {
  await connectDB();
  const agentObjectId = new mongoose.Types.ObjectId(agentId);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    loyaltyBalance,
    monthlyPoints,
    allTimePoints,
    monthlyCallCount,
    recentCalls,
    monthlyTarget,
    ranks,
    pointsTrendAgg,
    dailyCallsAgg,
    outcomesAgg,
    totalLifetimeCalls,
  ] = await Promise.all([
    // 1. Loyalty balance
    LoyaltyLedger.aggregate([
      { $match: { agent: agentObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then((res) => res[0]?.total ?? 0),

    // 2. This month CreditPoints
    CreditPoint.aggregate([
      { $match: { agent: agentObjectId, month: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // 3. All-time CreditPoints
    CreditPoint.aggregate([
      { $match: { agent: agentObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // 4. Monthly call count
    CallRecord.countDocuments({ agent: agentObjectId, month: { $gte: monthStart, $lt: nextMonthStart } }),

    // 5. Recent call records
    CallRecord.find({ agent: agentObjectId }).sort({ createdAt: -1 }).limit(5).lean(),

    // 6. Monthly target
    MonthlyTarget.findOne({ agent: agentObjectId, month: monthStart }).lean(),

    // 7. Ranks
    CreditPoint.aggregate([
      { $match: { month: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: '$agent', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),

    // 8. Points trend over 6 months
    CreditPoint.aggregate([
      { $match: { agent: agentObjectId, month: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$month' } }, points: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', points: 1, _id: 0 } },
    ]),

    // 9. Daily calls over past 7 days
    CallRecord.aggregate([
      { $match: { agent: agentObjectId, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%m/%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ]),

    // 10. Outcomes aggregation
    CallRecord.aggregate([
      { $match: { agent: agentObjectId } },
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
    ]),

    // 11. Total Lifetime Calls
    CallRecord.countDocuments({ agent: agentObjectId }),
  ]);

  const pos = ranks.findIndex((r) => r._id?.toString() === agentId);
  const rank = pos === -1 ? null : pos + 1;

  // Format Outcomes Distribution for Pie Chart with vibrant, robust hex colors
  const outcomeColors: Record<string, { label: string; fill: string }> = {
    interested: { label: 'Interested', fill: '#10b981' }, // Emerald Green
    call_back_later: { label: 'Call Back Later', fill: '#0284c7' }, // Sky Blue
    no_answer: { label: 'No Answer', fill: '#f59e0b' }, // Amber
    not_interested: { label: 'Not Interested', fill: '#64748b' }, // Slate Gray
  };

  const outcomesDistribution = outcomesAgg.map((o) => ({
    outcome: o._id,
    label: outcomeColors[o._id]?.label ?? o._id.replace('_', ' '),
    count: o.count,
    fill: outcomeColors[o._id]?.fill ?? '#8b5cf6',
  }));

  return {
    loyaltyBalance,
    monthlyPoints: monthlyPoints[0]?.total ?? 0,
    allTimePoints: allTimePoints[0]?.total ?? 0,
    monthlyCallCount,
    recentCalls,
    monthlyTarget: monthlyTarget?.callTarget ?? null,
    rank,
    totalAgents: ranks.length,
    pointsTrend: pointsTrendAgg,
    dailyCalls: dailyCallsAgg,
    outcomesDistribution,
    totalLifetimeCalls,
  };
}

export default async function AgentDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if ((session.user as any).role === 'admin') redirect('/admin/dashboard');

  const data = await getAgentDashboardData((session.user as any).id);
  const targetProgress = data.monthlyTarget
    ? Math.min(100, Math.round((data.monthlyCallCount / data.monthlyTarget) * 100))
    : null;

  return (
    <div className="space-y-6">
      {/* 1. Header with Welcome Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={`Welcome back, ${session.user.name?.split(' ')[0]}`}
          description="Your outreach snapshot, commission rewards, and monthly target tracking"
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
            href="/agent/call-records"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm' })}
          >
            <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
            Log Call Record
          </Link>

          <Link
            href="/agent/claims"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm' })}
          >
            <Wallet className="h-3.5 w-3.5 mr-1.5" />
            Claim Loyalty Cash
          </Link>

          <Link
            href="/agent/leaderboard"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm' })}
          >
            <Trophy className="h-3.5 w-3.5 mr-1.5" />
            Agent Leaderboard
          </Link>

          <Link
            href="/agent/call-records"
            className={buttonVariants({ variant: 'default', size: 'sm', className: 'h-8 shadow-sm' })}
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            Call History
          </Link>
        </div>
      </div>

      {/* 3. Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Loyalty Balance"
          value={`Rs. ${data.loyaltyBalance.toLocaleString()}`}
          description="Available for cash payout"
          icon={<Wallet className="h-4 w-4" />}
          badge={<Badge variant="secondary" className="text-[10px]">Claimable</Badge>}
        />
        <StatCard
          title="Monthly Points"
          value={data.monthlyPoints}
          description="Credit points earned this month"
          icon={<Award className="h-4 w-4" />}
        />
        <StatCard
          title="All-Time Points"
          value={data.allTimePoints}
          description="Career points accumulated"
          icon={<Sparkles className="h-4 w-4" />}
        />
        <StatCard
          title="Calls Made"
          value={data.monthlyCallCount}
          description="Calls logged this month"
          icon={<PhoneCall className="h-4 w-4" />}
        />
      </div>

      {/* 4. Target Progress & Rank Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Target Card */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Monthly Call Target
              </CardTitle>
              {data.monthlyTarget && (
                <Badge variant={targetProgress! >= 100 ? 'default' : 'outline'} className="text-[10px]">
                  {targetProgress}% Complete
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">Your call volume goal for this month</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {data.monthlyTarget ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{data.monthlyCallCount} calls completed</span>
                  <span className="text-muted-foreground font-mono">{data.monthlyTarget} target</span>
                </div>
                <Progress value={targetProgress ?? 0} className="h-2" />
                <p className="text-[11px] text-muted-foreground">
                  {targetProgress! >= 100
                    ? 'Target achieved! Outstanding performance.'
                    : `${data.monthlyTarget - data.monthlyCallCount} more calls needed to reach this month’s goal.`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No monthly target assigned for this cycle.</p>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard Standing */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Leaderboard Position
              </CardTitle>
              <Link
                href="/agent/leaderboard"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-xs h-7 gap-1' })}
              >
                Leaderboard
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription className="text-xs">Your rank among active agents</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {data.rank ? (
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-heading font-bold text-2xl shrink-0">
                  #{data.rank}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Ranked #{data.rank} of {data.totalAgents || 1} agents
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Earned {data.monthlyPoints} credit points this month
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                Start logging calls and registering students to earn your ranking.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Charts: Area Chart (Points Growth) + Bar Chart (Daily Calls) + Pie Chart (Outcomes Breakdown) */}
      <AgentDashboardCharts
        pointsTrend={data.pointsTrend}
        dailyCalls={data.dailyCalls}
        outcomesDistribution={data.outcomesDistribution}
        totalCalls={data.totalLifetimeCalls}
      />

      {/* 6. Recent Calls Table */}
      <Card className="bg-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Call Activity
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              The 5 most recent telephone calls logged by you
            </CardDescription>
          </div>
          <Link
            href="/agent/call-records"
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-xs h-7 gap-1' })}
          >
            View All Calls
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {data.recentCalls.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No calls logged yet. Start by clicking &quot;Log Call Record&quot; above!
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                    <TableHead className="py-2 font-semibold">Phone Number</TableHead>
                    <TableHead className="py-2 font-semibold">Outcome</TableHead>
                    <TableHead className="py-2 font-semibold">Notes</TableHead>
                    <TableHead className="py-2 text-right font-semibold">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentCalls.map((call: any) => (
                    <TableRow key={String(call._id)} className="hover:bg-muted/20 text-xs">
                      <TableCell className="py-2 font-mono font-medium">
                        {call.mobileNumber}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant={call.outcome === 'interested' ? 'default' : 'secondary'}
                          className="text-[10px] capitalize"
                        >
                          {call.outcome.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground text-[11px] truncate max-w-[200px]">
                        {call.notes || '—'}
                      </TableCell>
                      <TableCell className="py-2 text-right text-muted-foreground text-[11px]">
                        {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
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
  );
}
