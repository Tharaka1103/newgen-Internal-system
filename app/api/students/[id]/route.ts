import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Student, CallRecord, PaymentRecord } from '@/lib/db/models';
import { requirePermission } from '@/lib/auth/permissions';
import { Permission } from '@/lib/types';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requirePermission(Permission.STUDENTS_VIEW);
    await connectDB();

    const student = await Student.findById(id).lean();
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    // Fetch call history and payment history
    const [callRecords, payments] = await Promise.all([
      CallRecord.find({ mobileNumber: student.mobileNumber })
        .populate('agent', 'name email')
        .sort({ month: -1 })
        .limit(50)
        .lean(),
      PaymentRecord.find({ mobileNumber: student.mobileNumber })
        .populate('attributedAgent', 'name email')
        .populate('createdBy', 'name')
        .sort({ paymentMonth: -1 })
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: { student, callRecords, payments },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch student';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}
