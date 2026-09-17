import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/permissions';
import { sendTestEmail } from '@/lib/email/nodemailer';
import { Permission } from '@/lib/types';

export async function POST(request: Request) {
  try {
    await requirePermission(Permission.SETTINGS_SMTP);
    const { email } = await request.json();
    if (!email) return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    await sendTestEmail(email);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send test email';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
