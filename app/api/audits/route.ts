import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { AuditLog } from '@/lib/db/models';
import { requirePermission } from '@/lib/auth/permissions';
import { Permission } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requirePermission(Permission.AUDITS_VIEW);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get('actorId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '30'));

    const query: Record<string, unknown> = {};
    if (actorId) query.actor = actorId;
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) (query.createdAt as Record<string, unknown>).$gte = new Date(dateFrom);
      if (dateTo) (query.createdAt as Record<string, unknown>).$lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', 'name email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: { items: logs, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}
