import connectDB from '@/lib/db/mongoose';
import { User } from '@/lib/db/models';
import type { PermissionKey } from '@/lib/types';
import type { Types } from 'mongoose';

/**
 * Check if a user has a specific permission.
 * Admins always have all permissions.
 */
export async function hasPermission(
  userId: string | Types.ObjectId,
  permission: PermissionKey
): Promise<boolean> {
  await connectDB();
  const user = await User.findById(userId).select('role permissions status').lean();
  if (!user || user.status === 'disabled') return false;
  if (user.role === 'admin') return true;
  return user.permissions.includes(permission);
}

/**
 * Grant one or more permissions to a user.
 */
export async function grantPermissions(
  userId: string | Types.ObjectId,
  permissions: PermissionKey[]
): Promise<void> {
  await connectDB();
  await User.findByIdAndUpdate(userId, {
    $addToSet: { permissions: { $each: permissions } },
  });
}

/**
 * Revoke one or more permissions from a user.
 */
export async function revokePermissions(
  userId: string | Types.ObjectId,
  permissions: PermissionKey[]
): Promise<void> {
  await connectDB();
  await User.findByIdAndUpdate(userId, {
    $pull: { permissions: { $in: permissions } },
  });
}

/**
 * Set a user's entire permissions array.
 */
export async function setPermissions(
  userId: string | Types.ObjectId,
  permissions: PermissionKey[]
): Promise<void> {
  await connectDB();
  await User.findByIdAndUpdate(userId, { $set: { permissions } });
}
