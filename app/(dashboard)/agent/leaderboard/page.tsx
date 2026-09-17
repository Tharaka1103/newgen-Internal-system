import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db/mongoose';
import { CreditPoint } from '@/lib/db/models';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy } from 'lucide-react';
import { format } from 'date-fns';

async function getLeaderboardData(currentAgentId: string) {
  await connectDB();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [monthly, allTime] = await Promise.all([
    CreditPoint.aggregate([
      { $match: { month: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: '$agent', points: { $sum: '$amount' } } },
      { $sort: { points: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } },
      { $unwind: '$agent' },
      { $project: { agentId: '$_id', agentName: '$agent.name', points: 1 } },
    ]),
    CreditPoint.aggregate([
      { $group: { _id: '$agent', points: { $sum: '$amount' } } },
      { $sort: { points: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } },
      { $unwind: '$agent' },
      { $project: { agentId: '$_id', agentName: '$agent.name', points: 1 } },
    ]),
  ]);

  return { monthly, allTime };
}

interface RankEntry {
  agentId: { toString: () => string };
  agentName: string;
  points: number;
}

function RankList({ data, currentAgentId }: { data: RankEntry[]; currentAgentId: string }) {
  if (data.length === 0) {
    return <div className="text-center py-10 text-sm text-muted-foreground">No data yet.</div>;
  }

  return (
    <div className="space-y-2">
      {data.map((entry, index) => {
        const isMe = entry.agentId.toString() === currentAgentId;
        return (
          <Card key={entry.agentId.toString()} className={isMe ? 'ring-1 ring-primary' : ''}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                {index === 0 ? (
                  <Trophy className="h-5 w-5 text-chart-4" />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                )}
              </div>
              <span className="flex-1 text-sm font-medium">
                {entry.agentName} {isMe && <Badge variant="outline" className="text-xs ml-1">You</Badge>}
              </span>
              <Badge variant="secondary" className="font-mono text-sm shrink-0">{entry.points} pts</Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default async function AgentLeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const agentId = (session.user as any).id as string;
  const { monthly, allTime } = await getLeaderboardData(agentId);

  const now = new Date();
  const thisMonth = format(now, 'MMMM yyyy');

  return (
    <div className="space-y-4">
      <PageHeader title="Leaderboard" description="See how you rank among all agents" />
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly" id="agent-monthly-tab">This Month</TabsTrigger>
          <TabsTrigger value="alltime" id="agent-alltime-tab">All Time</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="mt-4">
          <p className="text-xs text-muted-foreground mb-3">{thisMonth}</p>
          <RankList data={monthly as RankEntry[]} currentAgentId={agentId} />
        </TabsContent>
        <TabsContent value="alltime" className="mt-4">
          <RankList data={allTime as RankEntry[]} currentAgentId={agentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
