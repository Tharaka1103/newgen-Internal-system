import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/permissions';
import { previewAttribution } from '@/lib/services/payment.service';
import { AttributionLookupSchema } from '@/lib/validations/payment';
import { Permission } from '@/lib/types';

// Live attribution preview — used by the payment form to show attributed agent inline
export async function GET(request: Request) {
  try {
    await requirePermission(Permission.PAYMENTS_VIEW);

    const { searchParams } = new URL(request.url);
    const mobileNumber = searchParams.get('mobileNumber') ?? '';
    const month = searchParams.get('month') ?? '';
    const studentId = searchParams.get('studentId') ?? undefined;

    const parsed = AttributionLookupSchema.safeParse({ mobileNumber, month });
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const result = await previewAttribution(parsed.data.mobileNumber, parsed.data.month, studentId);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve attribution';
    return NextResponse.json({ success: false, error: message }, { status: 403 });
  }
}
