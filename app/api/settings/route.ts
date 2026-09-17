import { NextResponse } from 'next/server';
import { requirePermission, requireAdmin } from '@/lib/auth/permissions';
import { getAllSettings, setSettings } from '@/lib/services/settings.service';
import { UpdateMultipleSettingsSchema } from '@/lib/validations/settings';
import { writeAuditLog, extractRequestMeta } from '@/lib/services/audit.service';
import { Permission, type SettingKeyType } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requirePermission(Permission.SETTINGS_GENERAL);
    const settings = await getAllSettings();
    return NextResponse.json(
      { success: true, data: settings },
      {
        headers: {
          'Cache-Control': 'private, no-cache, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settings';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin();
    const currentUser = session.user as any;

    const body = await request.json();
    const parsed = UpdateMultipleSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }

    await setSettings(
      parsed.data.settings as { key: SettingKeyType; value: string }[],
      currentUser.id
    );

    const { ip, userAgent } = extractRequestMeta(request);
    await writeAuditLog({
      actor: currentUser.id,
      actorName: currentUser.name ?? 'Admin',
      action: 'setting.update',
      entityType: 'Setting',
      after: { updatedKeys: parsed.data.settings.map((s) => s.key) },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
