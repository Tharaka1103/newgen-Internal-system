import { NextResponse } from 'next/server';
import { ResetPasswordSchema } from '@/lib/validations/user';
import connectDB from '@/lib/db/mongoose';
import { User } from '@/lib/db/models';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { getNumericSetting, getBooleanSetting } from '@/lib/services/settings.service';
import { SettingKey } from '@/lib/types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    const { token, password } = parsed.data;

    // Validate password policy
    const minLength = await getNumericSetting(SettingKey.PASSWORD_MIN_LENGTH);
    const requireUpper = await getBooleanSetting(SettingKey.PASSWORD_REQUIRE_UPPERCASE);
    const requireNumber = await getBooleanSetting(SettingKey.PASSWORD_REQUIRE_NUMBER);
    const requireSymbol = await getBooleanSetting(SettingKey.PASSWORD_REQUIRE_SYMBOL);

    if (password.length < minLength) {
      return NextResponse.json({ success: false, error: `Password must be at least ${minLength} characters.` }, { status: 400 });
    }
    if (requireUpper && !/[A-Z]/.test(password)) {
      return NextResponse.json({ success: false, error: 'Password must contain at least one uppercase letter.' }, { status: 400 });
    }
    if (requireNumber && !/[0-9]/.test(password)) {
      return NextResponse.json({ success: false, error: 'Password must contain at least one number.' }, { status: 400 });
    }
    if (requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json({ success: false, error: 'Password must contain at least one special character.' }, { status: 400 });
    }

    await connectDB();

    // Find user by hashed token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Reset link is invalid or has expired.' }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);
    user.passwordHash = passwordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginCount = 0;
    user.lockedUntil = undefined;
    await user.save();

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: user._id,
      actorName: user.name,
      action: 'auth.reset_password',
      entityType: 'User',
      entityId: user._id,
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (error) {
    console.error('[reset-password]', error);
    return NextResponse.json({ success: false, error: 'Failed to reset password.' }, { status: 500 });
  }
}
