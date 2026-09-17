import connectDB from '@/lib/db/mongoose';
import { AuditLog } from '@/lib/db/models';
import type { AuditAction, AuditEntityType } from '@/lib/types';
import type { Types } from 'mongoose';

interface WriteAuditLogParams {
  actor: Types.ObjectId | string;
  actorName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: Types.ObjectId | string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actor: params.actor,
      actorName: params.actorName,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before,
      after: params.after,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: params.metadata,
    });
  } catch (error) {
    // Audit log failures should never break the main operation — log to stderr
    console.error('[AuditLog] Failed to write audit log:', error);
  }
}

/**
 * Helper to extract IP and user-agent from a Next.js Request object
 */
export function extractRequestMeta(request: Request): { ip?: string; userAgent?: string } {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? undefined;
  const userAgent = request.headers.get('user-agent') ?? undefined;
  return { ip, userAgent };
}
