import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { requireAdmin } from '@/lib/auth/permissions';
import { createManualPayout } from '@/lib/services/claim.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await requireAdmin();
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();
    const { amount, note, bankDetails } = body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Please specify a valid payout amount greater than 0.' },
        { status: 400 }
      );
    }

    const { claim, newBalance } = await createManualPayout(
      id,
      {
        amount: Number(amount),
        note: note ? String(note).trim() : undefined,
        bankDetails,
      },
      currentUser.id
    );

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action: 'agent.manual_payout',
      entityType: 'User',
      entityId: id as any,
      after: {
        paidAmount: Number(amount),
        newBalance,
        note: note ?? '',
        claimId: claim._id,
      },
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        claim,
        newBalance,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process manual payout';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
