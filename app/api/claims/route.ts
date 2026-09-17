import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { ClaimRequest } from '@/lib/db/models';
import { requirePermission, requireAuth } from '@/lib/auth/permissions';
import { SubmitClaimSchema } from '@/lib/validations/claim';
import { submitClaim, getLoyaltyBalance } from '@/lib/services/claim.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Permission } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const currentUser = session.user as any;
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

    const query: Record<string, unknown> = {};

    // Agents only see their own claims
    if (currentUser.role === 'agent') {
      query.agent = currentUser.id;
    } else {
      // Admin: filter by status or agentId
      const agentId = searchParams.get('agentId');
      if (agentId) query.agent = agentId;
    }

    if (status) query.status = status;

    const [claims, total] = await Promise.all([
      ClaimRequest.find(query)
        .populate('agent', 'name email')
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ClaimRequest.countDocuments(query),
    ]);

    // Include agent's current balance if agent view
    let balance: number | undefined;
    if (currentUser.role === 'agent') {
      balance = await getLoyaltyBalance(currentUser.id);
    }

    return NextResponse.json({
      success: true,
      data: { items: claims, total, page, totalPages: Math.ceil(total / limit), balance },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch claims';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(Permission.CLAIMS_SUBMIT);
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();
    const parsed = SubmitClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const claim = await submitClaim(currentUser.id, parsed.data);

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Agent',
      action: 'claim.submit',
      entityType: 'ClaimRequest',
      entityId: claim._id,
      after: { requestedAmount: parsed.data.requestedAmount, bankName: parsed.data.bankDetails.bankName },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: claim }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit claim';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
