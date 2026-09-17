'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download } from 'lucide-react';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, LineChart, Line,
} from 'recharts';

const chartConfig = {
  count: { label: 'Count', color: 'var(--chart-1)' },
  totalAmount: { label: 'Amount (Rs.)', color: 'var(--chart-2)' },
  totalPaid: { label: 'Paid Out (Rs.)', color: 'var(--chart-3)' },
  totalPoints: { label: 'Credit Points', color: 'var(--chart-1)' },
};

function downloadCSV(url: string, filename: string) {
  fetch(url).then((r) => r.blob()).then((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function useReportData(type: string, params: Record<string, string> = {}) {
  const [data, setData] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setIsLoading(true);
    const qs = new URLSearchParams({ type, ...params });
    try {
      const res = await fetch(`/api/reports?${qs.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setData(json.data);
      else setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [type, JSON.stringify(params)]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, isLoading, refetch: fetch_ };
}

export default function ReportsPage() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const [startMonth, setStartMonth] = useState(`${thisYear - 1}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [endMonth, setEndMonth] = useState(`${thisYear}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const params = { startMonth, endMonth };

  const { data: agentPerf, isLoading: agentPerfLoading } = useReportData('agent_performance', params);
  const { data: registrations, isLoading: regLoading } = useReportData('registrations_over_time', params);
  const { data: payments, isLoading: payLoading } = useReportData('payments_over_time', params);
  const { data: payouts, isLoading: payoutsLoading } = useReportData('loyalty_payouts', params);

  const csvBase = `/api/reports?format=csv&startMonth=${startMonth}&endMonth=${endMonth}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Performance analytics and CSV exports"
        actions={
          <div className="flex items-center gap-2">
            <Input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="h-9 text-sm w-36" id="reports-start-month" />
            <span className="text-muted-foreground text-sm">→</span>
            <Input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="h-9 text-sm w-36" id="reports-end-month" />
          </div>
        }
      />

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-5 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => downloadCSV(`${csvBase}&type=agent_performance`, 'agent-performance.csv')} id="export-agent-performance-csv">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
          {agentPerfLoading ? (
            <Skeleton className="h-64" />
          ) : (agentPerf as any[]).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No data for selected period.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Registrations</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(agentPerf as Array<{ agentName: string; totalPoints: number; registrationMatches: number; paymentMatches: number }>).map((agent, i) => (
                    <TableRow key={String(i)}>
                      <TableCell className="text-muted-foreground font-medium">#{i + 1}</TableCell>
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
          )}
        </TabsContent>

        <TabsContent value="registrations" className="mt-5 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => downloadCSV(`${csvBase}&type=registrations_over_time`, 'registrations.csv')} id="export-registrations-csv">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Registration Trend</CardTitle>
              <CardDescription className="text-xs">Monthly student signups over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={registrations as Record<string, unknown>[]}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-5 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => downloadCSV(`${csvBase}&type=payments_over_time`, 'payments.csv')} id="export-payments-csv">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Payment Volume</CardTitle>
              <CardDescription className="text-xs">Total payment amounts collected each month</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={payments as Record<string, unknown>[]}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="totalAmount" fill="var(--chart-2)" radius={[3, 3, 0, 0]} name="Rs. Amount" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-5 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => downloadCSV(`${csvBase}&type=loyalty_payouts`, 'payouts.csv')} id="export-payouts-csv">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Loyalty Payouts</CardTitle>
              <CardDescription className="text-xs">Total amounts paid out to agents each month</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <LineChart data={payouts as Record<string, unknown>[]}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="totalPaid" stroke="var(--chart-3)" strokeWidth={2} dot={false} name="Paid Out (Rs.)" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
