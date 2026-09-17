import { NextResponse } from 'next/server';
import { ForgotPasswordSchema } from '@/lib/validations/user';
import connectDB from '@/lib/db/mongoose';
import { User } from '@/lib/db/models';
import { sendPasswordResetEmail } from '@/lib/email/nodemailer';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ForgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    const { email } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    }

    if (user.status === 'disabled') {
      return NextResponse.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    }

    // Generate secure reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${rawToken}`;

    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: user._id,
      actorName: user.name,
      action: 'auth.forgot_password',
      entityType: 'User',
      entityId: user._id,
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  } catch (error) {
    console.error('[forgot-password]', error);
    return NextResponse.json({ success: false, error: 'Failed to send reset email. Please check SMTP configuration.' }, { status: 500 });
  }
}
