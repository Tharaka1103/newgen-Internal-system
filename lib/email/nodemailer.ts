import nodemailer from 'nodemailer';
import connectDB from '@/lib/db/mongoose';
import { getAllSettings } from '@/lib/services/settings.service';
import { SettingKey } from '@/lib/types';

async function getSmtpTransporter() {
  // First try DB settings, then fall back to env
  const settings = await getAllSettings();

  const host = settings[SettingKey.SMTP_HOST] || process.env.SMTP_HOST || '';
  const port = parseInt(settings[SettingKey.SMTP_PORT] || process.env.SMTP_PORT || '587', 10);
  const secure = (settings[SettingKey.SMTP_SECURE] || process.env.SMTP_SECURE) === 'true';
  const user = settings[SettingKey.SMTP_USER] || process.env.SMTP_USER || '';
  const pass = settings[SettingKey.SMTP_PASS] || process.env.SMTP_PASS || '';
  const from = settings[SettingKey.SMTP_FROM] || process.env.SMTP_FROM || '';

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured. Please configure SMTP settings in Admin → Settings → SMTP.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return { transporter, from };
}

export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  resetUrl: string
): Promise<void> {
  await connectDB();
  const { transporter, from } = await getSmtpTransporter();

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1e293b;">Password Reset Request</h2>
      <p>Hi ${toName},</p>
      <p>We received a request to reset your password for your Newgen Online School account.</p>
      <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" style="
        display: inline-block;
        background-color: #2563eb;
        color: white;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 6px;
        margin: 16px 0;
        font-weight: 600;
      ">Reset Password</a>
      <p style="color: #64748b; font-size: 14px;">
        If you didn't request this, you can safely ignore this email. Your password won't change.
      </p>
      <p style="color: #64748b; font-size: 12px;">
        Or copy this link: <a href="${resetUrl}">${resetUrl}</a>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Reset your Newgen Online School password',
    html,
  });
}

export async function sendTestEmail(toEmail: string): Promise<void> {
  const { transporter, from } = await getSmtpTransporter();
  await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Newgen Online School — SMTP Test',
    text: 'If you received this email, your SMTP configuration is working correctly.',
  });
}
