import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { PaymentRecord } from '@/lib/db/models';
import { requirePermission } from '@/lib/auth/permissions';
import { CreatePaymentSchema } from '@/lib/validations/payment';
import { createPayment } from '@/lib/services/payment.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Permission } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requirePermission(Permission.PAYMENTS_VIEW);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const agentId = searchParams.get('agentId');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

    const query: Record<string, unknown> = {};
    if (month) {
      const [year, m] = month.split('-').map(Number);
      query.paymentMonth = new Date(Date.UTC(year, m - 1, 1));
    }
    if (agentId) query.attributedAgent = agentId;
    if (search) query.mobileNumber = { $regex: search, $options: 'i' };

    const [payments, total] = await Promise.all([
      PaymentRecord.find(query)
        .populate('student', 'name mobileNumber grade')
        .populate('attributedAgent', 'name email')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PaymentRecord.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: { items: payments, total, page, totalPages: Math.ceil(total / limit) },
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, stale-while-revalidate=15',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(Permission.PAYMENTS_CREATE);
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();
    const parsed = CreatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const result = await createPayment(parsed.data, currentUser.id);

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action: 'payment.create',
      entityType: 'PaymentRecord',
      entityId: result.payment._id,
      after: {
        mobileNumber: parsed.data.mobileNumber,
        studentId: parsed.data.studentId,
        amount: parsed.data.amount,
        paymentMonth: parsed.data.paymentMonth,
        attributedAgent: result.attributedAgentId?.toString(),
      },
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        payment: result.payment,
        attributedAgentId: result.attributedAgentId,
        creditPointsAwarded: result.creditPointsAwarded,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payment';
    const status = message.includes('already exists') ? 409 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

