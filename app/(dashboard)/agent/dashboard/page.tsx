import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import { CreditPoint, LoyaltyLedger, CallRecord, MonthlyTarget } from '@/lib/db/models';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

async function getAgentDashboardData(agentId: string) {
  await connectDB();
  const agentObjectId = new mongoose.Types.ObjectId(agentId);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [
    loyaltyBalance,
    monthlyPoints,
    allTimePoints,
    monthlyCallCount,
    recentCalls,
    monthlyTarget,
    rank,
  ] = await Promise.all([
    // Loyalty balance
    LoyaltyLedger.aggregate([
      { $match: { agent: agentObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then((res) => res[0]?.total ?? 0),
    // This month CreditPoints
    CreditPoint.aggregate([
      { $match: { agent: agentObjectId, month: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // All-time CreditPoints
    CreditPoint.aggregate([
      { $match: { agent: agentObjectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // Monthly call count
    CallRecord.countDocuments({ agent: agentObjectId, month: { $gte: monthStart, $lt: nextMonthStart } }),
    // Recent call records
    CallRecord.find({ agent: agentObjectId }).sort({ createdAt: -1 }).limit(5).lean(),
    // Monthly target
    MonthlyTarget.findOne({ agent: agentObjectId, month: monthStart }).lean(),
    // Rank (position among agents)
    CreditPoint.aggregate([
      { $match: { month: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: '$agent', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]).then((ranks) => {
      const pos = ranks.findIndex((r) => r._id?.toString() === agentId);
      return pos === -1 ? null : pos + 1;
    }),
  ]);

  return {
    loyaltyBalance,
    monthlyPoints: monthlyPoints[0]?.total ?? 0,
    allTimePoints: allTimePoints[0]?.total ?? 0,
    monthlyCallCount,
    recentCalls,
    monthlyTarget: monthlyTarget?.callTarget ?? null,
    rank,
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
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${session.user.name?.split(' ')[0]}`}
        description="Here's your performance snapshot for this month"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Loyalty Balance" value={`Rs. ${data.loyaltyBalance.toLocaleString()}`} description="Claimable earnings" />
        <StatCard title="Monthly Points" value={data.monthlyPoints} description="Credit points this month" />
        <StatCard title="All-Time Points" value={data.allTimePoints} description="Total career points" />
        <StatCard title="Calls Made" value={data.monthlyCallCount} description="This month" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly target */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium font-heading">Monthly Target</CardTitle>
            <CardDescription className="text-xs">Your call target progress for this month</CardDescription>
          </CardHeader>
          <CardContent>
            {data.monthlyTarget ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{data.monthlyCallCount} calls made</span>
                  <span className="text-muted-foreground">{data.monthlyTarget} target</span>
                </div>
                <Progress value={targetProgress ?? 0} className="h-2" />
                <p className="text-xs text-muted-foreground">{targetProgress}% complete</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No target set for this month.</p>
            )}
          </CardContent>
        </Card>

        {/* Rank card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium font-heading">Your Rank</CardTitle>
            <CardDescription className="text-xs">Your position among all agents this month</CardDescription>
          </CardHeader>
          <CardContent>
            {data.rank ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl font-heading font-bold">#{data.rank}</span>
                <p className="text-sm text-muted-foreground">with {data.monthlyPoints} credit points</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No credit points earned this month yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent calls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium font-heading">Recent Calls</CardTitle>
          <CardDescription className="text-xs">Your 5 most recent call records</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No call records yet. Start logging calls!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentCalls.map((call: { _id: { toString: () => string }; mobileNumber: string; outcome: string; createdAt: Date }) => (
                  <TableRow key={call._id.toString()}>
                    <TableCell className="font-medium">{call.mobileNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{call.outcome.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
