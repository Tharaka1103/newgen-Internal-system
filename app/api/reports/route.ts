import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Student, PaymentRecord, CreditPoint, ClaimRequest, CallRecord, MonthlyTarget } from '@/lib/db/models';
import { requirePermission, requireAuth } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/services/permission.service';
import {
  getAgentPerformanceReport,
  getRegistrationsOverTime,
  getPaymentsOverTime,
  getLoyaltyPayoutsOverTime,
  exportToCSV,
} from '@/lib/services/report.service';
import { Permission } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';

    if (type === 'agent_performance') {
      const session = await requireAuth();
      const allowed =
        (await hasPermission(session.user.id, Permission.LEADERBOARD_VIEW)) ||
        (await hasPermission(session.user.id, Permission.REPORTS_VIEW));
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You do not have permission to view leaderboard rankings.' },
          { status: 403 }
        );
      }
    } else {
      await requirePermission(Permission.REPORTS_VIEW);
    }

    await connectDB();
    const startMonth = searchParams.get('startMonth') ?? undefined;
    const endMonth = searchParams.get('endMonth') ?? undefined;
    const agentId = searchParams.get('agentId') ?? undefined;
    const format = searchParams.get('format') || 'json'; // json | csv

    let data: unknown;

    switch (type) {
      case 'agent_performance':
        data = await getAgentPerformanceReport({ startMonth, endMonth, agentId });
        break;
      case 'registrations_over_time':
        data = await getRegistrationsOverTime({ startMonth, endMonth });
        break;
      case 'payments_over_time':
        data = await getPaymentsOverTime({ startMonth, endMonth });
        break;
      case 'loyalty_payouts':
        data = await getLoyaltyPayoutsOverTime({ startMonth, endMonth });
        break;
      case 'summary':
      default: {
        const now = new Date();
        const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

        const [
          totalStudents,
          registrationsThisMonth,
          paymentsThisMonth,
          pendingClaims,
          topAgents,
        ] = await Promise.all([
          Student.countDocuments(),
          Student.countDocuments({ registrationDate: { $gte: currentMonthStart, $lt: nextMonthStart } }),
          PaymentRecord.aggregate([
            { $match: { paymentMonth: { $gte: currentMonthStart, $lt: nextMonthStart } } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ]),
          ClaimRequest.countDocuments({ status: 'pending' }),
          CreditPoint.aggregate([
            { $match: { month: { $gte: currentMonthStart, $lt: nextMonthStart } } },
            { $group: { _id: '$agent', points: { $sum: '$amount' } } },
            { $sort: { points: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } },
            { $unwind: '$agent' },
            { $project: { agentName: '$agent.name', agentEmail: '$agent.email', points: 1 } },
          ]),
        ]);

        data = {
          totalStudents,
          registrationsThisMonth,
          paymentsThisMonth: paymentsThisMonth[0] ?? { total: 0, count: 0 },
          pendingClaims,
          topAgents,
        };
        break;
      }
    }

    if (format === 'csv' && Array.isArray(data)) {
      const csv = exportToCSV(data as Record<string, unknown>[]);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'private, no-cache, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}
