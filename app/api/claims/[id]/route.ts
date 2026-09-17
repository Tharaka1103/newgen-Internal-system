import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { requirePermission } from '@/lib/auth/permissions';
import { ProcessClaimSchema } from '@/lib/validations/claim';
import { approveClaim, rejectClaim } from '@/lib/services/claim.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Permission } from '@/lib/types';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requirePermission(Permission.CLAIMS_PROCESS);

    const body = await request.json();
    const parsed = ProcessClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    let claim;
    if (parsed.data.action === 'approve') {
      claim = await approveClaim(id, parsed.data.paidAmount!, session.user.id, parsed.data.adminNote);
    } else {
      claim = await rejectClaim(id, parsed.data.adminNote ?? 'No reason provided', session.user.id);
    }

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: session.user.id,
      actorName: session.user.name ?? 'Admin',
      action: parsed.data.action === 'approve' ? 'claim.approve' : 'claim.reject',
      entityType: 'ClaimRequest',
      entityId: claim._id,
      after: {
        status: claim.status,
        paidAmount: claim.paidAmount,
        adminNote: claim.adminNote,
      },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: claim });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process claim';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
