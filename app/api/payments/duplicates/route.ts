import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { PaymentRecord, Student, CreditPoint } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth/permissions';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const duplicateGroups = await PaymentRecord.aggregate([
      {
        $group: {
          _id: { student: '$student', paymentMonth: '$paymentMonth' },
          count: { $sum: 1 },
          paymentIds: { $push: '$_id' },
          amounts: { $push: '$amount' },
          mobiles: { $push: '$mobileNumber' },
          createdAts: { $push: '$createdAt' },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1, '_id.paymentMonth': -1 } },
    ]);

    const enrichedGroups = await Promise.all(
      duplicateGroups.map(async (group) => {
        const student = await Student.findById(group._id.student).lean();
        const payments = await PaymentRecord.find({ _id: { $in: group.paymentIds } })
          .populate('attributedAgent', 'name email')
          .populate('createdBy', 'name')
          .sort({ createdAt: 1 })
          .lean();

        return {
          studentId: group._id.student,
          studentName: student?.name || 'Unknown / Deleted Student',
          mobileNumber: student?.mobileNumber || group.mobiles[0] || 'Unknown',
          grade: student?.grade || 'unknown',
          paymentMonth: group._id.paymentMonth,
          count: group.count,
          redundantCount: group.count - 1,
          payments,
        };
      })
    );

    const totalRedundantRecords = enrichedGroups.reduce((acc, g) => acc + g.redundantCount, 0);

    return NextResponse.json({
      success: true,
      data: {
        groups: enrichedGroups,
        totalDuplicateGroups: enrichedGroups.length,
        totalRedundantRecords,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch duplicate payments';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const { studentId, paymentMonth } = body;

    const matchStage: Record<string, unknown> = {};
    if (studentId && paymentMonth) {
      matchStage.student = new mongoose.Types.ObjectId(studentId);
      matchStage.paymentMonth = new Date(paymentMonth);
    }

    const groups = await PaymentRecord.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: { student: '$student', paymentMonth: '$paymentMonth' },
          count: { $sum: 1 },
          paymentIds: { $push: '$_id' },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    let totalRemoved = 0;
    const removedPaymentIds: mongoose.Types.ObjectId[] = [];

    for (const group of groups) {
      // Fetch records sorted by createdAt ascending
      const records = await PaymentRecord.find({ _id: { $in: group.paymentIds } })
        .sort({ createdAt: 1 })
        .lean();

      if (records.length <= 1) continue;

      // Keep the first (oldest) payment record
      const [kept, ...redundant] = records;
      const idsToDelete = redundant.map((r) => r._id);

      // 1. Remove duplicate/extra credit points awarded for these redundant records
      await CreditPoint.deleteMany({ referenceId: { $in: idsToDelete } });

      // 2. Remove redundant payment records
      const delResult = await PaymentRecord.deleteMany({ _id: { $in: idsToDelete } });
      totalRemoved += delResult.deletedCount || idsToDelete.length;
      removedPaymentIds.push(...idsToDelete);
    }

    // Try creating/ensuring the compound unique index now that duplicates are resolved
    try {
      await PaymentRecord.collection.createIndex(
        { student: 1, paymentMonth: 1 },
        { unique: true, background: true }
      );
    } catch {
      // index may already exist or will build
    }

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action: 'payment.deduplicate',
      entityType: 'PaymentRecord',
      entityId: removedPaymentIds[0] || (new mongoose.Types.ObjectId() as any),
      after: {
        groupsCleaned: groups.length,
        removedRecordsCount: totalRemoved,
        removedPaymentIds: removedPaymentIds.map((id) => id.toString()),
      },
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        groupsCleaned: groups.length,
        removedCount: totalRemoved,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deduplicate payments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
