import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { CallRecord } from '@/lib/db/models';
import { requirePermission, requireAuth } from '@/lib/auth/permissions';
import { CreateCallRecordSchema } from '@/lib/validations/call-record';
import { createCallRecord } from '@/lib/services/callRecord.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Permission } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const session = await requirePermission(Permission.CALL_RECORDS_VIEW);
    const currentUser = session.user as any;
    await connectDB();

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const month = searchParams.get('month');
    const search = searchParams.get('search');
    const outcome = searchParams.get('outcome');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

    const query: Record<string, unknown> = {};

    // Agents can only see their own records
    if (currentUser.role === 'agent') {
      query.agent = currentUser.id;
    } else if (agentId) {
      query.agent = agentId;
    }

    if (month) {
      const [year, m] = month.split('-').map(Number);
      query.month = new Date(Date.UTC(year, m - 1, 1));
    }

    if (outcome) query.outcome = outcome;

    if (search) {
      query.mobileNumber = { $regex: search, $options: 'i' };
    }

    const [records, total] = await Promise.all([
      CallRecord.find(query)
        .populate('agent', 'name email')
        .populate('correctedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CallRecord.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: { items: records, total, page, totalPages: Math.ceil(total / limit) },
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, stale-while-revalidate=15',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch call records';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(Permission.CALL_RECORDS_CREATE);
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();
    const parsed = CreateCallRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const record = await createCallRecord(currentUser.id, parsed.data);

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Agent',
      action: 'call_record.create',
      entityType: 'CallRecord',
      entityId: record._id,
      after: { mobileNumber: parsed.data.mobileNumber, month: parsed.data.month, outcome: parsed.data.outcome },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create call record';
    const status = message.includes('already exists') || message.includes('not open') ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
