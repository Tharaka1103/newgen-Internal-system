import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { CallRecordEditRequest, CallRecord } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth/permissions';
import { createNotification } from '@/lib/services/notification.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Types } from 'mongoose';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await requireAdmin();
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();
    const { action, adminNote } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Action must be 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    const editRequest = await CallRecordEditRequest.findById(id).populate('callRecord');
    if (!editRequest) {
      return NextResponse.json({ success: false, error: 'Edit request not found.' }, { status: 404 });
    }

    if (editRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `This request has already been ${editRequest.status}.` },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    editRequest.status = newStatus;
    editRequest.adminNote = adminNote ? adminNote.trim() : undefined;
    editRequest.reviewedBy = currentUser.id as Types.ObjectId;
    editRequest.reviewedAt = new Date();
    await editRequest.save();

    const record = editRequest.callRecord as any;
    const mobileStr = record?.mobileNumber ? ` for ${record.mobileNumber}` : '';

    if (action === 'approve') {
      await createNotification({
        recipientId: editRequest.agent,
        type: 'call_record_edit_approved',
        title: 'Edit Request Approved',
        message: `Your request to edit call record${mobileStr} was approved. You can now edit this record in Call Records.`,
        referenceId: editRequest._id,
        entityType: 'CallRecordEditRequest',
      });
    } else {
      const reasonStr = adminNote && adminNote.trim() ? ` Reason: ${adminNote.trim()}` : '';
      await createNotification({
        recipientId: editRequest.agent,
        type: 'call_record_edit_rejected',
        title: 'Edit Request Rejected',
        message: `Your request to edit call record${mobileStr} was rejected.${reasonStr}`,
        referenceId: editRequest._id,
        entityType: 'CallRecordEditRequest',
      });
    }

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action: action === 'approve' ? 'call_record.edit_approve' : 'call_record.edit_reject',
      entityType: 'CallRecordEditRequest',
      entityId: editRequest._id,
      after: { status: newStatus, adminNote },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: editRequest });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process edit request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
