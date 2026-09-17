'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';
import { format } from 'date-fns';

interface AgentRank {
  agentName: string;
  agentEmail: string;
  totalPoints: number;
  registrationMatches: number;
  paymentMatches: number;
}

function LeaderboardTable({ data, isLoading }: { data: AgentRank[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  }

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
            <TableHead className="text-right">Registrations</TableHead>
            <TableHead className="text-right">Payments</TableHead>
            <TableHead className="text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((agent, index) => (
            <TableRow key={agent.agentEmail}>
              <TableCell>
                {index === 0 ? (
                  <Trophy className="h-4 w-4 text-chart-4" />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                )}
              </TableCell>
              <TableCell className="font-medium">{agent.agentName}</TableCell>
              <TableCell className="text-right text-muted-foreground">{agent.registrationMatches}</TableCell>
              <TableCell className="text-right text-muted-foreground">{agent.paymentMatches}</TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary" className="font-mono text-xs">{agent.totalPoints} pts</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function LeaderboardPage() {
  const [monthlyData, setMonthlyData] = useState<AgentRank[]>([]);
  const [allTimeData, setAllTimeData] = useState<AgentRank[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [allTimeLoading, setAllTimeLoading] = useState(true);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    fetch(`/api/reports?type=agent_performance&startMonth=${thisMonth}&endMonth=${thisMonth}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setMonthlyData(d.data); })
      .finally(() => setMonthlyLoading(false));

    fetch('/api/reports?type=agent_performance')
      .then((r) => r.json())
      .then((d) => { if (d.success) setAllTimeData(d.data); })
      .finally(() => setAllTimeLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard"
        description="Agent rankings by credit points earned"
      />
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly" id="monthly-leaderboard-tab">This Month</TabsTrigger>
          <TabsTrigger value="alltime" id="alltime-leaderboard-tab">All Time</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="mt-5">
          <p className="text-xs text-muted-foreground mb-4">
            {format(new Date(thisMonth + '-01'), 'MMMM yyyy')}
          </p>
          <LeaderboardTable data={monthlyData} isLoading={monthlyLoading} />
        </TabsContent>
        <TabsContent value="alltime" className="mt-5">
          <LeaderboardTable data={allTimeData} isLoading={allTimeLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
