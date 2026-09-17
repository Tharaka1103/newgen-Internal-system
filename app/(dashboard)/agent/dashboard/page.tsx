import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import { CreditPoint, LoyaltyLedger, CallRecord, MonthlyTarget } from '@/lib/db/models';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Wallet, Phone, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

async function getAgentDashboardData(agentId: string) {
  await connectDB();
  const agentObjectId = new mongoose.Types.ObjectId(agentId);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const thisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

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
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${session.user.name?.split(' ')[0]}`}
        description="Your performance overview"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Loyalty Balance" value={`Rs. ${data.loyaltyBalance.toLocaleString()}`} icon={Wallet} description="Claimable earnings" />
        <StatCard title="CreditPoints (Month)" value={data.monthlyPoints} icon={Trophy} />
        <StatCard title="All-Time Points" value={data.allTimePoints} icon={Trophy} />
        <StatCard title="Calls This Month" value={data.monthlyCallCount} icon={Phone} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly target */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-heading flex items-center gap-2">
              <Target className="h-4 w-4" />
              Monthly Call Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyTarget ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{data.monthlyCallCount} calls made</span>
                  <span className="text-muted-foreground">{data.monthlyTarget} target</span>
                </div>
                <Progress value={targetProgress ?? 0} className="h-2" />
                <p className="text-xs text-muted-foreground">{targetProgress}% complete</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No target set for this month.</p>
            )}
          </CardContent>
        </Card>

        {/* Rank card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-heading flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Your Rank This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.rank ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl font-heading font-bold">#{data.rank}</span>
                <p className="text-sm text-muted-foreground">with {data.monthlyPoints} credit points</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No credit points earned this month yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent calls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium font-heading">Recent Call Records</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No call records yet. Start logging calls!</p>
          ) : (
            <div className="space-y-2">
              {data.recentCalls.map((call: { _id: { toString: () => string }; mobileNumber: string; outcome: string; createdAt: Date }) => (
                <div key={call._id.toString()} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 font-medium">{call.mobileNumber}</span>
                  <Badge variant="outline" className="text-xs capitalize">{call.outcome.replace('_', ' ')}</Badge>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
