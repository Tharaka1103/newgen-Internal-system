import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { CallRecord, CallRecordEditRequest, Student, User } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth/permissions';
import { notifyAdmins } from '@/lib/services/notification.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Types } from 'mongoose';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const currentUser = session.user as any;
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

    const query: Record<string, unknown> = {};

    // Agents only see their own requests
    if (currentUser.role !== 'admin') {
      query.agent = currentUser.id;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    // Search by agent name or mobile number
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };

      // Find matching agents
      const matchingAgents = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select('_id').lean();
      const agentIds = matchingAgents.map((a) => a._id);

      // Find matching call records
      const matchingCallRecords = await CallRecord.find({
        mobileNumber: searchRegex,
      }).select('_id').lean();
      const callRecordIds = matchingCallRecords.map((c) => c._id);

      query.$or = [
        { agent: { $in: agentIds } },
        { callRecord: { $in: callRecordIds } },
        { reason: searchRegex },
      ];
    }

    const [requests, total] = await Promise.all([
      CallRecordEditRequest.find(query)
        .populate('agent', 'name email')
        .populate('callRecord')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CallRecordEditRequest.countDocuments(query),
    ]);

    // Enrich each request with matching Student profile details (if any)
    const enriched = await Promise.all(
      requests.map(async (req: any) => {
        let student = null;
        if (req.callRecord?.mobileNumber && req.callRecord?.grade) {
          student = await Student.findOne({
            mobileNumber: req.callRecord.mobileNumber,
            grade: req.callRecord.grade,
          })
            .select('name grade medium registrationDate status')
            .lean();
        }
        return {
          ...req,
          student,
        };
      })
    );

    const pendingCount = await CallRecordEditRequest.countDocuments({
      ...(currentUser.role !== 'admin' ? { agent: currentUser.id } : {}),
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      data: {
        items: enriched,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        pendingCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch edit requests';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();
    const { callRecordId, reason } = body;

    if (!callRecordId || !reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: 'Call record ID and reason note are required.' },
        { status: 400 }
      );
    }

    // Verify call record exists
    const callRecord = await CallRecord.findById(callRecordId);
    if (!callRecord) {
      return NextResponse.json({ success: false, error: 'Call record not found.' }, { status: 404 });
    }

    // Agents can only request for their own records
    if (currentUser.role !== 'admin' && callRecord.agent.toString() !== currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'You are only allowed to request edits for your own call records.' },
        { status: 403 }
      );
    }

    // Check if there is already a pending edit request
    const existingPending = await CallRecordEditRequest.findOne({
      callRecord: callRecord._id,
      status: 'pending',
    });
    if (existingPending) {
      return NextResponse.json(
        { success: false, error: 'An edit request for this call record is already pending admin review.' },
        { status: 409 }
      );
    }

    const editRequest = await CallRecordEditRequest.create({
      callRecord: callRecord._id,
      agent: currentUser.id,
      reason: reason.trim(),
      status: 'pending',
    });

    // Notify all admins
    await notifyAdmins({
      type: 'call_record_edit_requested',
      title: 'Call Record Edit Request',
      message: `Agent ${currentUser.name ?? 'Agent'} requested permission to edit call record for ${callRecord.mobileNumber} (${callRecord.grade}). Reason: "${reason.trim()}"`,
      referenceId: editRequest._id,
      entityType: 'CallRecordEditRequest',
    });

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Agent',
      action: 'call_record.edit_request',
      entityType: 'CallRecordEditRequest',
      entityId: editRequest._id,
      after: { callRecordId: callRecord._id, reason: reason.trim() },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: editRequest }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit edit request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
