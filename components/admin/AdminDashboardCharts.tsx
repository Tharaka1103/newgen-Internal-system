'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, PieChart as PieIcon, Layers } from 'lucide-react';

interface RevenueDataPoint {
  month: string;
  totalAmount: number;
  count: number;
}

interface RegistrationDataPoint {
  month: string;
  count: number;
}

interface MediumDataPoint {
  medium: string;
  count: number;
  label: string;
  fill: string;
}

interface AdminDashboardChartsProps {
  revenueTrend: RevenueDataPoint[];
  registrationTrend: RegistrationDataPoint[];
  mediumDistribution: MediumDataPoint[];
}

export function AdminDashboardCharts({
  revenueTrend,
  registrationTrend,
  mediumDistribution,
}: AdminDashboardChartsProps) {
  const revenueChartConfig = {
    totalAmount: {
      label: 'Tuition Collected',
      color: '#2563eb',
    },
  };

  const registrationChartConfig = {
    count: {
      label: 'Registrations',
      color: '#0ea5e9',
    },
  };

  const mediumChartConfig = {
    sinhala: {
      label: 'Sinhala Medium (Rs. 1,600)',
      color: '#2563eb',
    },
    english: {
      label: 'English Medium (Rs. 2,000)',
      color: '#10b981',
    },
  };

  const totalStudents = mediumDistribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-6">
      {/* Top 2-grid: Area Chart (Revenue) & Bar Chart (Registrations) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. AREA CHART: Revenue Trend */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Monthly Fee Collections (Area Chart)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Gross tuition fee collections over recent months
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono">
                LKR Trend
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {revenueTrend.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                No payment data recorded yet.
              </div>
            ) : (
              <ChartContainer config={revenueChartConfig} className="h-[220px] w-full">
                <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminRevenueArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val) => `Rs. ${Number(val).toLocaleString()}`}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="totalAmount"
                    name="Tuition Collected"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#adminRevenueArea)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 2. BAR CHART: Monthly Student Enrollments */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Student Registrations (Bar Chart)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Monthly new student volume across all grades
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                Last 6 Months
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {registrationTrend.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                No registration records available yet.
              </div>
            ) : (
              <ChartContainer config={registrationChartConfig} className="h-[220px] w-full">
                <BarChart data={registrationTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    name="Registrations"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={42}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. PIE CHART: Medium Distribution (Sinhala vs English) */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-primary" />
                Instruction Medium Distribution (Pie Chart)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Proportion of enrolled students across Sinhala Medium (Rs. 1,600) vs English Medium (Rs. 2,000)
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {totalStudents} Total Students
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {totalStudents === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
              No student medium records available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Pie Chart display */}
              <div className="h-[190px] md:col-span-1 flex items-center justify-center">
                <ChartContainer config={mediumChartConfig} className="h-[180px] w-[180px] mx-auto">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                    <Pie
                      data={mediumDistribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {mediumDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>

              {/* Breakdown Cards */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mediumDistribution.map((item) => {
                  const pct = totalStudents > 0 ? Math.round((item.count / totalStudents) * 100) : 0;
                  const isEnglish = item.medium === 'english';

                  return (
                    <div
                      key={item.medium}
                      className="p-3.5 rounded-lg border bg-muted/20 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-xs font-semibold text-foreground">
                            {isEnglish ? 'English Medium' : 'Sinhala Medium'}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {isEnglish ? 'Rs. 2,000 / mo' : 'Rs. 1,600 / mo'}
                        </Badge>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-2xl font-bold font-heading text-foreground">
                          {item.count}{' '}
                          <span className="text-xs font-normal text-muted-foreground">students</span>
                        </span>
                        <span className="text-sm font-semibold text-primary font-mono">{pct}%</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
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
