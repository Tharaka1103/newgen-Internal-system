import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { User } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth/permissions';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    await connectDB();

    const body = await request.json();
    const { password, confirmationText } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password confirmation is required to retire your account.' },
        { status: 400 }
      );
    }

    if (confirmationText !== 'RETIRE') {
      return NextResponse.json(
        { success: false, error: 'Please type RETIRE to confirm account deletion.' },
        { status: 400 }
      );
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Administrator account not found.' }, { status: 404 });
    }

    // Verify admin password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password. Retirement cancelled.' },
        { status: 400 }
      );
    }

    // Check that there is at least one other active administrator
    const otherActiveAdmins = await User.countDocuments({
      role: 'admin',
      status: 'active',
      _id: { $ne: user._id },
    });

    if (otherActiveAdmins < 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Action blocked: You are the only active administrator in the system. You must create or promote another administrator before you can retire your account.',
        },
        { status: 403 }
      );
    }

    const before = {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    // Delete the administrator account
    await User.findByIdAndDelete(user._id);

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: user._id.toString(),
      actorName: user.name,
      action: 'user.delete',
      entityType: 'User',
      entityId: user._id.toString(),
      before,
      metadata: { reason: 'voluntary_administrator_retirement' },
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Your administrator account has been permanently retired and removed from the system.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retire account';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
