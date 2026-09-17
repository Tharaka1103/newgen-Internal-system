import connectDB from '@/lib/db/mongoose';
import { Notification } from '@/lib/db/models';
import type { NotificationType } from '@/lib/types';
import type { Types } from 'mongoose';

interface CreateNotificationParams {
  recipientId: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: Types.ObjectId | string;
  entityType?: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await connectDB();
    await Notification.create({
      recipient: params.recipientId,
      type: params.type,
      title: params.title,
      message: params.message,
      referenceId: params.referenceId,
      entityType: params.entityType,
      read: false,
    });
  } catch (error) {
    console.error('[Notification] Failed to create notification:', error);
  }
}

export async function markNotificationRead(
  notificationId: string,
  recipientId: string
): Promise<void> {
  await connectDB();
  await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: recipientId },
    { $set: { read: true } }
  );
}

export async function markAllNotificationsRead(recipientId: string): Promise<void> {
  await connectDB();
  await Notification.updateMany({ recipient: recipientId, read: false }, { $set: { read: true } });
}

export async function getUnreadCount(recipientId: string): Promise<number> {
  await connectDB();
  return Notification.countDocuments({ recipient: recipientId, read: false });
}
