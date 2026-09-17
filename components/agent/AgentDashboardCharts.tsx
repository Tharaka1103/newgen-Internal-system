'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { TrendingUp, PhoneCall, PieChart as PieIcon, Award } from 'lucide-react';

interface PointsTrendPoint {
  month: string;
  points: number;
}

interface DailyCallsPoint {
  date: string;
  count: number;
}

interface OutcomeDataPoint {
  outcome: string;
  label: string;
  count: number;
  fill: string;
}

interface AgentDashboardChartsProps {
  pointsTrend: PointsTrendPoint[];
  dailyCalls: DailyCallsPoint[];
  outcomesDistribution: OutcomeDataPoint[];
  totalCalls: number;
}

export function AgentDashboardCharts({
  pointsTrend,
  dailyCalls,
  outcomesDistribution,
  totalCalls,
}: AgentDashboardChartsProps) {
  const pointsChartConfig = {
    points: {
      label: 'Credit Points',
      color: '#8b5cf6',
    },
  };

  const callsChartConfig = {
    count: {
      label: 'Calls Logged',
      color: '#0284c7',
    },
  };

  const outcomeConfig: Record<string, { label: string; color: string }> = {};
  outcomesDistribution.forEach((item) => {
    outcomeConfig[item.outcome] = {
      label: item.label,
      color: item.fill,
    };
  });

  return (
    <div className="space-y-6">
      {/* 2-Column Grid: Area Chart (Points Growth) & Bar Chart (Daily Calls) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. AREA CHART: Points Trajectory */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Commission Points Growth (Area Chart)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Monthly reward points earned from registrations and student payments
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono">
                Points Trend
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {pointsTrend.length === 0 ? (
              <div className="h-[210px] flex items-center justify-center text-xs text-muted-foreground">
                No commission points recorded yet.
              </div>
            ) : (
              <ChartContainer config={pointsChartConfig} className="h-[210px] w-full">
                <AreaChart data={pointsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="agentPointsArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val) => `${Number(val).toLocaleString()} pts`}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="points"
                    name="Credit Points"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fill="url(#agentPointsArea)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 2. BAR CHART: Daily Calls Logged */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-primary" />
                  Calls Logged Activity (Bar Chart)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Daily parent outreach and telephone volume (Recent Days)
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                Activity
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {dailyCalls.length === 0 ? (
              <div className="h-[210px] flex items-center justify-center text-xs text-muted-foreground">
                No recent calls logged.
              </div>
            ) : (
              <ChartContainer config={callsChartConfig} className="h-[210px] w-full">
                <BarChart data={dailyCalls} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    name="Calls Logged"
                    fill="#0284c7"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. PIE CHART: Call Outcomes Breakdown */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-primary" />
                Call Outcomes Distribution (Pie Chart)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Proportion of interested parents, follow-ups, and connection rates
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {totalCalls} Total Calls
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {totalCalls === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
              No call records logged yet to generate outcome breakdown.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Pie Chart */}
              <div className="h-[190px] md:col-span-1 flex items-center justify-center">
                <ChartContainer config={outcomeConfig} className="h-[180px] w-[180px] mx-auto">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                    <Pie
                      data={outcomesDistribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {outcomesDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>

              {/* Outcome summary badges / metrics */}
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-3">
                {outcomesDistribution.map((item) => {
                  const pct = totalCalls > 0 ? Math.round((item.count / totalCalls) * 100) : 0;
                  return (
                    <div
                      key={item.outcome}
                      className="p-3 rounded-lg border bg-muted/20 flex flex-col justify-between space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-xs font-semibold text-foreground truncate">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-primary font-mono shrink-0">{pct}%</span>
                      </div>

                      <div className="flex items-baseline justify-between pt-0.5">
                        <span className="text-xl font-bold font-heading text-foreground">
                          {item.count}{' '}
                          <span className="text-[11px] font-normal text-muted-foreground">calls</span>
                        </span>
                      </div>

                      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: item.fill }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
