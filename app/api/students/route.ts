import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Student } from '@/lib/db/models';
import { requireAuth, requirePermission } from '@/lib/auth/permissions';
import { CreateStudentSchema } from '@/lib/validations/student';
import { registerStudent } from '@/lib/services/registration.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Permission } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const session = await requirePermission(Permission.STUDENTS_VIEW);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const grade = searchParams.get('grade');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (grade) query.grade = grade;

    const [students, total] = await Promise.all([
      Student.find(query).sort({ registrationDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Student.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: { items: students, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch students';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(Permission.STUDENTS_CREATE);
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();
    const parsed = CreateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const result = await registerStudent({
      input: parsed.data,
      createdBy: currentUser.id,
      autoCreated: false,
    });

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action: 'student.create',
      entityType: 'Student',
      entityId: result.student._id,
      after: { name: parsed.data.name, mobileNumber: parsed.data.mobileNumber, grade: parsed.data.grade, isNew: result.isNew },
      ip,
      userAgent,
      metadata: {
        attributedAgent: result.attributedAgentId?.toString(),
        creditPointsAwarded: result.creditPointsAwarded,
        loyaltyPointsAwarded: result.loyaltyPointsAwarded,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        student: result.student,
        isNew: result.isNew,
        attributedAgentId: result.attributedAgentId,
        creditPointsAwarded: result.creditPointsAwarded,
        loyaltyPointsAwarded: result.loyaltyPointsAwarded,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create student';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
