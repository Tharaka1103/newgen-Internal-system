import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { User } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth/permissions';
import { UpdateUserSchema } from '@/lib/validations/user';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { grantPermissions, revokePermissions, setPermissions } from '@/lib/services/permission.service';
import bcrypt from 'bcryptjs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireAdmin();
    await connectDB();

    const user = await User.findById(id)
      .select('-passwordHash -resetPasswordToken -resetPasswordExpires -sessions')
      .lean();

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAdmin();
    const currentUser = session.user as any;
    await connectDB();

    const body = await request.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const user = await User.findById(id).select('-passwordHash -resetPasswordToken');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const before = { name: user.name, email: user.email, status: user.status, permissions: [...user.permissions] };

    if (parsed.data.name) user.name = parsed.data.name;
    if (parsed.data.email) user.email = parsed.data.email.toLowerCase();
    if (parsed.data.status) user.status = parsed.data.status;
    if (parsed.data.password) {
      user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    }
    if (parsed.data.permissions !== undefined) {
      await setPermissions(user._id, parsed.data.permissions as never[]);
    }

    await user.save();

    const action = parsed.data.status === 'disabled' ? 'user.disable'
      : parsed.data.status === 'active' ? 'user.enable'
      : 'user.update';

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action,
      entityType: 'User',
      entityId: user._id,
      before,
      after: { name: user.name, email: user.email, status: user.status },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: { id: user._id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAdmin();
    const currentUser = session.user as any;

    if (id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account.' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const before = {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    await User.findByIdAndDelete(id);

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action: 'user.delete',
      entityType: 'User',
      entityId: id as any,
      before,
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
