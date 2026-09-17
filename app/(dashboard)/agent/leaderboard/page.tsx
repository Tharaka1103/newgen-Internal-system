import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db/mongoose';
import { CreditPoint } from '@/lib/db/models';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
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

function RankTable({ data, currentAgentId }: { data: RankEntry[]; currentAgentId: string }) {
  if (data.length === 0) {
    return <div className="text-center py-16 text-sm text-muted-foreground">No data yet.</div>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead className="text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry, index) => {
            const isMe = entry.agentId.toString() === currentAgentId;
            return (
              <TableRow key={entry.agentId.toString()} className={isMe ? 'bg-primary/5' : ''}>
                <TableCell>
                  {index === 0 ? (
                    <Trophy className="h-4 w-4 text-chart-4" />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {entry.agentName}
                  {isMe && <Badge variant="outline" className="text-xs ml-2">You</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="font-mono text-xs">{entry.points} pts</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
    <div className="space-y-6">
      <PageHeader title="Leaderboard" description="See how you rank among all agents" />
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly" id="agent-monthly-tab">This Month</TabsTrigger>
          <TabsTrigger value="alltime" id="agent-alltime-tab">All Time</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="mt-5">
          <p className="text-xs text-muted-foreground mb-4">{thisMonth}</p>
          <RankTable data={monthly as RankEntry[]} currentAgentId={agentId} />
        </TabsContent>
        <TabsContent value="alltime" className="mt-5">
          <RankTable data={allTime as RankEntry[]} currentAgentId={agentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
