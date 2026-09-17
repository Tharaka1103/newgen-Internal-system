import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { Notification } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth/permissions';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/services/notification.service';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const currentUser = session.user as any;
    await connectDB();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));

    // Admin sees all notifications; agents see only their own
    const query: Record<string, unknown> = {};
    if (currentUser.role !== 'admin') {
      query.recipient = currentUser.id;
    } else {
      const recipientId = searchParams.get('recipientId');
      if (recipientId) query.recipient = recipientId;
    }

    if (unreadOnly) query.read = false;

    const [notifications, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Notification.countDocuments(query),
    ]);

    const unreadCount = await Notification.countDocuments({ ...query, read: false });

    return NextResponse.json({
      success: true,
      data: { items: notifications, total, page, totalPages: Math.ceil(total / limit), unreadCount },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const currentUser = session.user as any;
    const body = await request.json();

    if (body.markAllRead) {
      await markAllNotificationsRead(currentUser.id);
    } else if (body.id) {
      await markNotificationRead(body.id, currentUser.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update notification';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
