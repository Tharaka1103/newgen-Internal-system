import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db/mongoose';
import { Student, PaymentRecord, CreditPoint, ClaimRequest } from '@/lib/db/models';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DashboardRegistrationChart } from '@/components/admin/DashboardRegistrationChart';
import { getRegistrationsOverTime } from '@/lib/services/report.service';
import { toMonthStart } from '@/lib/services/matching.service';

async function getDashboardData() {
  await connectDB();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const sixMonthsAgo = toMonthStart(
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() - 4 > 0 ? now.getUTCMonth() - 4 : now.getUTCMonth() + 8).padStart(2, '0')}`
  );

  const [
    totalStudents,
    registrationsThisMonth,
    paymentsThisMonthAgg,
    pendingClaims,
    topAgents,
    registrationsTrend,
  ] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ registrationDate: { $gte: monthStart, $lt: nextMonthStart } }),
    PaymentRecord.aggregate([
      { $match: { paymentMonth: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    ClaimRequest.countDocuments({ status: 'pending' }),
    CreditPoint.aggregate([
      { $match: { month: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: '$agent', points: { $sum: '$amount' } } },
      { $sort: { points: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } },
      { $unwind: '$agent' },
      { $project: { agentName: '$agent.name', points: 1 } },
    ]),
    getRegistrationsOverTime({ startMonth: `${now.getUTCFullYear() - (now.getUTCMonth() < 5 ? 1 : 0)}-${String(now.getUTCMonth() < 5 ? now.getUTCMonth() + 7 : now.getUTCMonth() - 4).padStart(2, '0')}` }),
  ]);

  return {
    totalStudents,
    registrationsThisMonth,
    paymentsThisMonth: paymentsThisMonthAgg[0] ?? { total: 0, count: 0 },
    pendingClaims,
    topAgents,
    registrationsTrend: registrationsTrend.slice(-6),
  };
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') redirect('/agent/dashboard');

  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Your school at a glance — key numbers for this month"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={data.totalStudents.toLocaleString()}
          description="All registered students"
        />
        <StatCard
          title="New This Month"
          value={data.registrationsThisMonth}
          description="Student registrations"
        />
        <StatCard
          title="Revenue"
          value={`Rs. ${(data.paymentsThisMonth.total ?? 0).toLocaleString()}`}
          description={`${data.paymentsThisMonth.count ?? 0} payment(s) this month`}
        />
        <StatCard
          title="Pending Claims"
          value={data.pendingClaims}
          description="Awaiting your review"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Registrations chart */}
        <DashboardRegistrationChart data={data.registrationsTrend} />

        {/* Mini leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium font-heading">Top Performers</CardTitle>
            <CardDescription className="text-xs">Agents ranked by credit points this month</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No credit points recorded this month yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topAgents.map((agent: { _id: string; agentName: string; points: number }, index: number) => (
                  <div key={String(agent._id)} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">
                      #{index + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">{agent.agentName}</span>
                    <Badge variant="secondary" className="font-mono text-xs shrink-0">
                      {agent.points} pts
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
