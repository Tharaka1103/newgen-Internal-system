import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { requirePermission } from '@/lib/auth/permissions';
import { AdminCorrectCallRecordSchema } from '@/lib/validations/call-record';
import { adminCorrectCallRecord } from '@/lib/services/callRecord.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Permission } from '@/lib/types';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requirePermission(Permission.CALL_RECORDS_CORRECT);

    const body = await request.json();
    const parsed = AdminCorrectCallRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const { record, before } = await adminCorrectCallRecord(id, parsed.data, session.user.id);

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: session.user.id,
      actorName: session.user.name ?? 'Admin',
      action: 'call_record.admin_correct',
      entityType: 'CallRecord',
      entityId: record._id,
      before,
      after: {
        mobileNumber: record.mobileNumber,
        grade: record.grade,
        month: record.month,
        outcome: record.outcome,
        notes: record.notes,
      },
      metadata: { correctionReason: parsed.data.correctionReason },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to correct call record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
