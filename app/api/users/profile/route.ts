import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { User } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth/permissions';
import { ChangePasswordSchema, UpdateProfileSchema } from '@/lib/validations/user';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await requireAuth();
    await connectDB();

    const user = await User.findById(session.user.id)
      .select('name email role status createdAt')
      .lean();

    if (!user) {
      return NextResponse.json({ success: false, error: 'User profile not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    await connectDB();

    const body = await request.json();
    const { action } = body; // 'profile' | 'password'

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    const { ip, userAgent } = extractRequestMeta(request);

    if (action === 'password') {
      const parsed = ChangePasswordSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid password details.' },
          { status: 400 }
        );
      }

      // Verify current password
      const isMatch = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Your current password is incorrect. Please try again.' },
          { status: 400 }
        );
      }

      // Hash and set new password
      user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
      await user.save();

      await writeAuditLog({
        actor: user._id.toString(),
        actorName: user.name,
        action: 'auth.reset_password',
        entityType: 'User',
        entityId: user._id.toString(),
        metadata: { email: user.email },
        ip,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        message: 'Password has been changed successfully.',
      });
    }

    if (action === 'profile') {
      const parsed = UpdateProfileSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid profile details.' },
          { status: 400 }
        );
      }

      const newEmail = parsed.data.email.toLowerCase().trim();
      const newName = parsed.data.name.trim();

      // Check if email changed and if new email is already taken
      if (newEmail !== user.email.toLowerCase()) {
        const existing = await User.findOne({ email: newEmail, _id: { $ne: user._id } });
        if (existing) {
          return NextResponse.json(
            { success: false, error: 'This email address is already in use by another account.' },
            { status: 400 }
          );
        }
      }

      const before = { name: user.name, email: user.email };
      user.name = newName;
      user.email = newEmail;
      await user.save();

      await writeAuditLog({
        actor: user._id.toString(),
        actorName: user.name,
        action: 'user.update',
        entityType: 'User',
        entityId: user._id.toString(),
        before,
        after: { name: user.name, email: user.email },
        ip,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        message: 'Profile information updated successfully.',
        data: {
          id: String(user._id),
          name: user.name,
          email: user.email,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
