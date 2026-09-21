import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { LoyaltyLedger } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth/permissions';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await requireAdmin();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

    const agentObjectId = new mongoose.Types.ObjectId(id);

    const [items, total] = await Promise.all([
      LoyaltyLedger.find({ agent: agentObjectId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LoyaltyLedger.countDocuments({ agent: agentObjectId }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch agent ledger';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}
