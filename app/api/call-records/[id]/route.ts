import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { requireAuth } from '@/lib/auth/permissions';
import { CallRecord, CallRecordEditRequest } from '@/lib/db/models';
import { AdminCorrectCallRecordSchema } from '@/lib/validations/call-record';
import { adminCorrectCallRecord, backfillAttributionForCallRecord } from '@/lib/services/callRecord.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Permission } from '@/lib/types';
import { checkPermissionInToken } from '@/lib/auth/token-permissions';
import { normaliseSLMobile, SL_MOBILE_REGEX } from '@/lib/validations/phone';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth();
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();

    const hasAdminCorrectPermission = checkPermissionInToken(
      currentUser.permissions,
      currentUser.role,
      Permission.CALL_RECORDS_CORRECT
    );

    // Case 1: Admin correction with full correction permission
    if (currentUser.role === 'admin' || hasAdminCorrectPermission) {
      const parsed = AdminCorrectCallRecordSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
          { status: 400 }
        );
      }

      const { record, before } = await adminCorrectCallRecord(id, parsed.data, currentUser.id);

      const { ip, userAgent } = extractRequestMeta(request);
      await writeAuditLog({
        actor: currentUser.id,
        actorName: currentUser.name ?? 'Admin',
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
    }

    // Case 2: Agent editing with an approved edit request
    const approvedRequest = await CallRecordEditRequest.findOne({
      callRecord: id,
      agent: currentUser.id,
      status: 'approved',
    });

    if (!approvedRequest) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to edit this call record. Please request permission from an administrator first.',
        },
        { status: 403 }
      );
    }

    const record = await CallRecord.findById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Call record not found.' }, { status: 404 });
    }

    const before = {
      mobileNumber: record.mobileNumber,
      grade: record.grade,
      outcome: record.outcome,
      notes: record.notes,
    };

    // Apply allowed agent updates
    if (body.mobileNumber !== undefined) {
      const norm = normaliseSLMobile(body.mobileNumber);
      if (!SL_MOBILE_REGEX.test(norm)) {
        return NextResponse.json({ success: false, error: 'Invalid Sri Lankan mobile number format.' }, { status: 400 });
      }
      record.mobileNumber = norm;
    }
    if (body.grade !== undefined) record.grade = body.grade;
    if (body.outcome !== undefined) record.outcome = body.outcome;
    if (body.notes !== undefined) record.notes = body.notes ? String(body.notes).trim() : '';

    try {
      await record.save();
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json(
          { success: false, error: 'A call record already exists for this mobile number, grade, and month.' },
          { status: 409 }
        );
      }
      throw err;
    }

    // Mark edit request as completed
    approvedRequest.status = 'completed';
    await approvedRequest.save();

    // Check backfill attribution in case mobileNumber or grade changed
    await backfillAttributionForCallRecord(record);

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Agent',
      action: 'call_record.edit',
      entityType: 'CallRecord',
      entityId: record._id,
      before,
      after: {
        mobileNumber: record.mobileNumber,
        grade: record.grade,
        outcome: record.outcome,
        notes: record.notes,
      },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update call record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
