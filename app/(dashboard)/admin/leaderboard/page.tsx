'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Trophy, PhoneCall, Award, Medal, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AgentRank {
  agentName: string;
  agentEmail: string;
  totalPoints: number;
  registrationMatches: number; // Success Calls / New student registrations
  paymentMatches: number;
}

type RankingMetric = 'success_calls' | 'points';

export default function LeaderboardPage() {
  const [monthlyData, setMonthlyData] = useState<AgentRank[]>([]);
  const [allTimeData, setAllTimeData] = useState<AgentRank[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Top toggle options: 'success_calls' (default) vs 'points'
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('success_calls');
  const [timeRange, setTimeRange] = useState<'monthly' | 'alltime'>('monthly');

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch(`/api/reports?type=agent_performance&startMonth=${thisMonth}&endMonth=${thisMonth}`).then((r) => r.json()),
      fetch('/api/reports?type=agent_performance').then((r) => r.json()),
    ])
      .then(([monthlyRes, allTimeRes]) => {
        if (monthlyRes.success) setMonthlyData(monthlyRes.data || []);
        if (allTimeRes.success) setAllTimeData(allTimeRes.data || []);
      })
      .finally(() => setIsLoading(false));
  }, [thisMonth]);

  const activeRawData = timeRange === 'monthly' ? monthlyData : allTimeData;

  // Sort based on selected ranking metric
  const sortedData = [...activeRawData].sort((a, b) => {
    if (rankingMetric === 'success_calls') {
      if (b.registrationMatches !== a.registrationMatches) {
        return b.registrationMatches - a.registrationMatches;
      }
      return b.totalPoints - a.totalPoints;
    } else {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return b.registrationMatches - a.registrationMatches;
    }
  });

  const top3 = sortedData.slice(0, 3);

  // Chart data preparation
  const chartData = sortedData.slice(0, 8).map((a) => ({
    name: a.agentName.split(' ')[0],
    fullName: a.agentName,
    successCalls: a.registrationMatches,
    points: a.totalPoints,
  }));

  const chartConfig = {
    successCalls: {
      label: 'Success Calls',
      color: '#0284c7',
    },
    points: {
      label: 'Points',
      color: '#f59e0b',
    },
  };

  const chartColor = rankingMetric === 'success_calls' ? '#0284c7' : '#f59e0b';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Agent Leaderboard"
          description="Performance rankings tracking successful student registrations and earned points"
        />

        {/* Time period switcher */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as 'monthly' | 'alltime')}>
          <TabsList>
            <TabsTrigger value="monthly">
              This Month ({format(new Date(thisMonth + '-01'), 'MMM yyyy')})
            </TabsTrigger>
            <TabsTrigger value="alltime">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* TOP OPTION TOGGLE (User's primary requirement: Success Calls vs Points) */}
      <Card className="border-primary/20 bg-muted/20">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Ranking Metric
            </span>
            <p className="text-sm font-medium text-foreground">
              {rankingMetric === 'success_calls'
                ? 'Ranking agents by number of newly registered students (Success Calls)'
                : 'Ranking agents by total commission reward points earned'}
            </p>
          </div>

          <Tabs
            value={rankingMetric}
            onValueChange={(val) => setRankingMetric(val as RankingMetric)}
            className="shrink-0"
          >
            <TabsList className="grid grid-cols-2 w-[310px]">
              <TabsTrigger value="success_calls" className="flex items-center gap-1.5 text-xs">
                <PhoneCall className="h-3.5 w-3.5 text-primary" />
                <span>Success Calls</span>
              </TabsTrigger>
              <TabsTrigger value="points" className="flex items-center gap-1.5 text-xs">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                <span>Points</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick explanation guide for non-technical users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border bg-card text-xs flex items-start gap-2.5">
          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <PhoneCall className="h-3 w-3" />
          </div>
          <div>
            <p className="font-semibold text-foreground">What are Success Calls?</p>
            <p className="text-muted-foreground mt-0.5">
              When an agent calls a parent/student and that student signs up and registers in the system, it is recorded as a verified Success Call.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg border bg-card text-xs flex items-start gap-2.5">
          <div className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
            <Trophy className="h-3 w-3" />
          </div>
          <div>
            <p className="font-semibold text-foreground">What are Points?</p>
            <p className="text-muted-foreground mt-0.5">
              Credit reward points earned automatically each time a student registers or completes their tuition fee payment.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl w-full" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl w-full" />
        </div>
      ) : sortedData.length === 0 ? (
        <div className="border border-dashed rounded-xl p-16 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold">No performance data yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {timeRange === 'monthly'
              ? 'No student registrations or call matches recorded for this month.'
              : 'Call center activity will appear here once calls and student registrations match.'}
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* #1 Winner */}
            {top3[0] && (
              <Card className="border-primary/40 bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Trophy className="h-20 w-20 text-primary" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-bold text-xs gap-1">
                      <Trophy className="h-3 w-3" />
                      1st Place
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">Top Performer</span>
                  </div>
                  <CardTitle className="text-base font-bold mt-2 truncate">
                    {top3[0].agentName}
                  </CardTitle>
                  <CardDescription className="text-xs truncate">{top3[0].agentEmail}</CardDescription>
                </CardHeader>
                <CardContent className="pt-1">
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Success Calls</span>
                      <span className="text-lg font-bold text-foreground">
                        {top3[0].registrationMatches}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[11px]">Total Points</span>
                      <span className="text-lg font-bold text-primary font-mono">
                        {top3[0].totalPoints} pts
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* #2 Runner up */}
            {top3[1] && (
              <Card className="bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-bold text-xs gap-1">
                      <Medal className="h-3 w-3" />
                      2nd Place
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-2 truncate">
                    {top3[1].agentName}
                  </CardTitle>
                  <CardDescription className="text-xs truncate">{top3[1].agentEmail}</CardDescription>
                </CardHeader>
                <CardContent className="pt-1">
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Success Calls</span>
                      <span className="text-lg font-bold text-foreground">
                        {top3[1].registrationMatches}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[11px]">Total Points</span>
                      <span className="text-lg font-bold text-primary font-mono">
                        {top3[1].totalPoints} pts
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* #3 3rd Place */}
            {top3[2] && (
              <Card className="bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-bold text-xs gap-1">
                      <Medal className="h-3 w-3" />
                      3rd Place
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-2 truncate">
                    {top3[2].agentName}
                  </CardTitle>
                  <CardDescription className="text-xs truncate">{top3[2].agentEmail}</CardDescription>
                </CardHeader>
                <CardContent className="pt-1">
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Success Calls</span>
                      <span className="text-lg font-bold text-foreground">
                        {top3[2].registrationMatches}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[11px]">Total Points</span>
                      <span className="text-lg font-bold text-primary font-mono">
                        {top3[2].totalPoints} pts
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AREA CHART VISUALIZATION */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Top Agents Performance Comparison
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Visual distribution of {rankingMetric === 'success_calls' ? 'successful student calls' : 'commission points'} across leading agents
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize font-medium">
                    {rankingMetric === 'success_calls' ? 'Success Calls' : 'Points'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey={rankingMetric === 'success_calls' ? 'successCalls' : 'points'}
                      name={rankingMetric === 'success_calls' ? 'Success Calls' : 'Points'}
                      stroke={chartColor}
                      strokeWidth={2.5}
                      fill="url(#areaGradient)"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* COMPLETE RANKINGS TABLE */}
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-16 font-semibold">Rank</TableHead>
                  <TableHead className="font-semibold">Agent</TableHead>
                  <TableHead
                    className={`text-right font-semibold ${rankingMetric === 'success_calls' ? 'text-primary' : ''
                      }`}
                  >
                    Success Calls (Registered)
                  </TableHead>
                  <TableHead className="text-right font-semibold">Paid Enrolments</TableHead>
                  <TableHead
                    className={`text-right font-semibold pr-6 ${rankingMetric === 'points' ? 'text-primary' : ''
                      }`}
                  >
                    Total Points
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((agent, index) => {
                  const isTop1 = index === 0;
                  const isTop2 = index === 1;
                  const isTop3 = index === 2;

                  return (
                    <TableRow
                      key={agent.agentEmail}
                      className={isTop1 ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/20'}
                    >
                      <TableCell className="font-medium">
                        {isTop1 ? (
                          <div className="flex items-center gap-1 text-amber-500 font-bold">
                            <Trophy className="h-4 w-4 shrink-0" />
                            <span>#1</span>
                          </div>
                        ) : isTop2 ? (
                          <div className="flex items-center gap-1 text-slate-400 font-bold">
                            <Medal className="h-4 w-4 shrink-0" />
                            <span>#2</span>
                          </div>
                        ) : isTop3 ? (
                          <div className="flex items-center gap-1 text-amber-700 font-bold">
                            <Medal className="h-4 w-4 shrink-0" />
                            <span>#3</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground font-mono pl-1">
                            #{index + 1}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{agent.agentName}</p>
                          <p className="text-xs text-muted-foreground">{agent.agentEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`text-sm font-semibold ${rankingMetric === 'success_calls'
                              ? 'text-primary font-bold'
                              : 'text-foreground'
                            }`}
                        >
                          {agent.registrationMatches}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {agent.paymentMatches}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge
                          variant={rankingMetric === 'points' ? 'default' : 'secondary'}
                          className="font-mono text-xs"
                        >
                          {agent.totalPoints} pts
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
