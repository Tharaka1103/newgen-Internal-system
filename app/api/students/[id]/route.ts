import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Student, CallRecord, PaymentRecord } from '@/lib/db/models';
import { requirePermission } from '@/lib/auth/permissions';
import { Permission } from '@/lib/types';
import { UpdateStudentSchema } from '@/lib/validations/student';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';

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
        .limit(50)
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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requirePermission(Permission.STUDENTS_EDIT);
    await connectDB();

    const body = await request.json();
    const parsed = UpdateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
        { status: 400 }
      );
    }

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const before = {
      name: student.name,
      mobileNumber: student.mobileNumber,
      grade: student.grade,
      medium: student.medium ?? 'sinhala',
      status: student.status,
    };

    const updateData: Record<string, any> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.mobileNumber !== undefined) updateData.mobileNumber = parsed.data.mobileNumber;
    if (parsed.data.grade !== undefined) updateData.grade = parsed.data.grade;
    if (parsed.data.medium !== undefined) updateData.medium = parsed.data.medium;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.registrationDate !== undefined) {
      updateData.registrationDate = new Date(parsed.data.registrationDate);
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, returnDocument: 'after', runValidators: true }
    );

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: session.user.id,
      actorName: session.user.name ?? 'Staff',
      action: 'student.update',
      entityType: 'Student',
      entityId: student._id,
      before,
      after: {
        name: updatedStudent?.name,
        mobileNumber: updatedStudent?.mobileNumber,
        grade: updatedStudent?.grade,
        medium: updatedStudent?.medium ?? 'sinhala',
        status: updatedStudent?.status,
      },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: updatedStudent });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update student';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requirePermission(Permission.STUDENTS_DELETE);
    await connectDB();

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const before = {
      name: student.name,
      mobileNumber: student.mobileNumber,
      grade: student.grade,
    };

    await Student.findByIdAndDelete(id);

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: session.user.id,
      actorName: session.user.name ?? 'Staff',
      action: 'student.delete',
      entityType: 'Student',
      entityId: id as any,
      before,
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete student';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
