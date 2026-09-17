'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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

function LeaderboardList({ data, isLoading }: { data: AgentRank[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>;
  }

  if (data.length === 0) {
    return <div className="text-center py-12 text-sm text-muted-foreground">No data yet.</div>;
  }

  return (
    <div className="space-y-2">
      {data.map((agent, index) => (
        <Card key={agent.agentEmail}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              {index === 0 ? (
                <Trophy className="h-5 w-5 text-chart-4" />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{agent.agentName}</p>
              <p className="text-xs text-muted-foreground">
                {agent.registrationMatches} registrations · {agent.paymentMatches} payments
              </p>
            </div>
            <Badge variant="secondary" className="font-mono text-sm shrink-0">
              {agent.totalPoints} pts
            </Badge>
          </CardContent>
        </Card>
      ))}
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
    <div className="space-y-4">
      <PageHeader
        title="Leaderboard"
        description={`Agent rankings by CreditPoints`}
      />
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly" id="monthly-leaderboard-tab">This Month</TabsTrigger>
          <TabsTrigger value="alltime" id="alltime-leaderboard-tab">All Time</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="mt-4">
          <p className="text-xs text-muted-foreground mb-3">
            {format(new Date(thisMonth + '-01'), 'MMMM yyyy')}
          </p>
          <LeaderboardList data={monthlyData} isLoading={monthlyLoading} />
        </TabsContent>
        <TabsContent value="alltime" className="mt-4">
          <LeaderboardList data={allTimeData} isLoading={allTimeLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
