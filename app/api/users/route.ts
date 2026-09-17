import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { User } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth/permissions';
import { CreateUserSchema } from '@/lib/validations/user';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { ADMIN_PERMISSIONS, DEFAULT_AGENT_PERMISSIONS, Permission, type PermissionKey } from '@/lib/types';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

    const query: Record<string, unknown> = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -resetPasswordToken -resetPasswordExpires -sessions')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: { items: users, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    await connectDB();

    const body = await request.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const { name, email, password, role, permissions } = parsed.data;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'A user with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const defaultPermissions: PermissionKey[] = role === 'admin'
      ? []  // admins get all permissions implicitly
      : ((permissions as PermissionKey[]) ?? DEFAULT_AGENT_PERMISSIONS);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      permissions: defaultPermissions,
      status: 'active',
    });

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: session.user.id,
      actorName: session.user.name ?? 'Admin',
      action: 'user.create',
      entityType: 'User',
      entityId: (user as any)._id,
      after: { name, email, role },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: { id: (user as any)._id, name, email, role } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
