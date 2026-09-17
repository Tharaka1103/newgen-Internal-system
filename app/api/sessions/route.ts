import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { User } from '@/lib/db/models';
import { requirePermission } from '@/lib/auth/permissions';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Permission } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requirePermission(Permission.SESSIONS_VIEW);
    await connectDB();

    const users = await User.find({ 'sessions.0': { $exists: true } })
      .select('name email role sessions')
      .lean();

    const sessions = users.flatMap((user) =>
      user.sessions.map((s) => ({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        sessionToken: s.sessionToken,
        ip: s.ip,
        userAgent: s.userAgent,
        lastSeen: s.lastSeen,
        createdAt: s.createdAt,
      }))
    );

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sessions';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requirePermission(Permission.SESSIONS_REVOKE);
    const currentUser = session.user as any;
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionToken = searchParams.get('sessionToken');

    if (!userId || !sessionToken) {
      return NextResponse.json({ success: false, error: 'userId and sessionToken are required' }, { status: 400 });
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { sessions: { sessionToken } },
    });

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action: 'session.revoke',
      entityType: 'Session',
      metadata: { targetUserId: userId, sessionToken },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
