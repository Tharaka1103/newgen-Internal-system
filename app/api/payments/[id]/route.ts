import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { PaymentRecord, CreditPoint } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth/permissions';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await requireAdmin();
    const currentUser = session.user as any;
    await connectDB();

    const payment = await PaymentRecord.findById(id).populate('student', 'name mobileNumber grade');
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment record not found' }, { status: 404 });
    }

    const beforeState = {
      _id: payment._id.toString(),
      mobileNumber: payment.mobileNumber,
      amount: payment.amount,
      paymentMonth: payment.paymentMonth,
      studentId: (payment.student as any)?._id?.toString(),
      studentName: (payment.student as any)?.name,
      studentGrade: (payment.student as any)?.grade,
      creditPointsAwarded: payment.creditPointsAwarded,
      attributedAgent: payment.attributedAgent?.toString(),
    };

    // 1. Remove any associated credit points awarded for this payment
    await CreditPoint.deleteMany({ referenceId: payment._id });

    // 2. Delete the payment record
    await PaymentRecord.findByIdAndDelete(id);

    // 3. Log audit event
    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action: 'payment.delete',
      entityType: 'PaymentRecord',
      entityId: payment._id,
      before: beforeState,
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment record deleted successfully',
      data: { id: payment._id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete payment record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
