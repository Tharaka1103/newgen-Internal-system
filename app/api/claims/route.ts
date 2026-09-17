import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { ClaimRequest, User } from '@/lib/db/models';
import { requirePermission, requireAuth } from '@/lib/auth/permissions';
import { SubmitClaimSchema } from '@/lib/validations/claim';
import { submitClaim, getLoyaltyBalance } from '@/lib/services/claim.service';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Permission } from '@/lib/types';
import Papa from 'papaparse';
import { format } from 'date-fns';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const currentUser = session.user as any;
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const formatParam = searchParams.get('format');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

    const query: Record<string, unknown> = {};

    // Agents only see their own claims
    if (currentUser.role === 'agent') {
      query.agent = currentUser.id;
    } else {
      // Admin: filter by status or agentId
      const agentId = searchParams.get('agentId');
      if (agentId) query.agent = agentId;
    }

    if (status && status !== 'all') query.status = status;

    if (search) {
      const userMatches = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id').lean();
      const userIds = userMatches.map((u) => u._id);

      query.$or = [
        { agent: { $in: userIds } },
        { 'bankDetails.accountName': { $regex: search, $options: 'i' } },
        { 'bankDetails.accountNumber': { $regex: search, $options: 'i' } },
        { 'bankDetails.bankName': { $regex: search, $options: 'i' } },
        { 'bankDetails.branchName': { $regex: search, $options: 'i' } },
      ];
    }

    // CSV Export Handler
    if (formatParam === 'csv') {
      const allMatchingClaims = await ClaimRequest.find(query)
        .populate('agent', 'name email')
        .populate('processedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      const csvData = allMatchingClaims.map((c: any) => ({
        'Claim ID': String(c._id),
        'Agent Name': c.agent?.name ?? 'Unknown',
        'Agent Email': c.agent?.email ?? 'Unknown',
        'Requested Amount (LKR)': c.requestedAmount,
        'Paid Amount (LKR)': c.paidAmount ?? (c.status === 'paid' ? c.requestedAmount : 0),
        'Status': c.status.toUpperCase(),
        'Bank Name': c.bankDetails?.bankName ?? '',
        'Branch': c.bankDetails?.branchName ?? '',
        'Account Number': c.bankDetails?.accountNumber ?? '',
        'Account Holder Name': c.bankDetails?.accountName ?? '',
        'Admin Remarks': c.adminNote ?? '',
        'Submission Date': c.createdAt ? format(new Date(c.createdAt), 'yyyy-MM-dd HH:mm') : '',
        'Processed Date': c.paidAt ? format(new Date(c.paidAt), 'yyyy-MM-dd HH:mm') : '',
        'Processed By': c.processedBy?.name ?? '',
      }));

      const csv = Papa.unparse(csvData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="claims-export-${Date.now()}.csv"`,
        },
      });
    }

    // Standard JSON Response with Pagination & Stats
    const [claims, total, statsAgg] = await Promise.all([
      ClaimRequest.find(query)
        .populate('agent', 'name email')
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ClaimRequest.countDocuments(query),
      currentUser.role !== 'agent'
        ? ClaimRequest.aggregate([
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalRequested: { $sum: '$requestedAmount' },
                totalPaid: { $sum: '$paidAmount' },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    // Parse stats for admin overview
    let stats = {
      pendingCount: 0,
      pendingAmount: 0,
      paidCount: 0,
      paidAmount: 0,
      rejectedCount: 0,
      totalClaims: 0,
    };

    if (Array.isArray(statsAgg)) {
      statsAgg.forEach((s) => {
        if (s._id === 'pending') {
          stats.pendingCount = s.count;
          stats.pendingAmount = s.totalRequested;
        } else if (s._id === 'paid') {
          stats.paidCount = s.count;
          stats.paidAmount = s.totalPaid || s.totalRequested;
        } else if (s._id === 'rejected') {
          stats.rejectedCount = s.count;
        }
        stats.totalClaims += s.count;
      });
    }

    // Include agent's current balance if agent view
    let balance: number | undefined;
    if (currentUser.role === 'agent') {
      balance = await getLoyaltyBalance(currentUser.id);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          items: claims,
          total,
          page,
          totalPages: Math.ceil(total / limit),
          balance,
          stats: currentUser.role !== 'agent' ? stats : undefined,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, stale-while-revalidate=15',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch claims';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(Permission.CLAIMS_SUBMIT);
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();
    const parsed = SubmitClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const claim = await submitClaim(currentUser.id, parsed.data);

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Agent',
      action: 'claim.submit',
      entityType: 'ClaimRequest',
      entityId: claim._id,
      after: { requestedAmount: parsed.data.requestedAmount, bankName: parsed.data.bankDetails.bankName },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: claim }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit claim';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
