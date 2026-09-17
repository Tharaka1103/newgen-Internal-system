import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { MonthlyTarget } from '@/lib/db/models';
import { requirePermission } from '@/lib/auth/permissions';
import { SetMonthlyTargetSchema } from '@/lib/validations/settings';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { toMonthStart } from '@/lib/services/matching.service';
import { Permission } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requirePermission(Permission.TARGETS_MANAGE);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const month = searchParams.get('month');

    const query: Record<string, unknown> = {};
    if (agentId) query.agent = agentId;
    if (month) query.month = toMonthStart(month);

    const targets = await MonthlyTarget.find(query)
      .populate('agent', 'name email')
      .sort({ month: -1 })
      .lean();

    return NextResponse.json({ success: true, data: targets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch targets';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(Permission.TARGETS_MANAGE);
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();
    const parsed = SetMonthlyTargetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const monthDate = toMonthStart(parsed.data.month);

    const target = await MonthlyTarget.findOneAndUpdate(
      { agent: parsed.data.agentId, month: monthDate },
      { callTarget: parsed.data.callTarget, createdBy: currentUser.id },
      { upsert: true, new: true }
    );

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action: 'target.set',
      entityType: 'MonthlyTarget',
      entityId: target._id,
      after: { agentId: parsed.data.agentId, month: parsed.data.month, callTarget: parsed.data.callTarget },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: target }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set target';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
