import connectDB from '@/lib/db/mongoose';
import { CallRecord } from '@/lib/db/models';
import type { ICallRecord } from '@/lib/db/models/CallRecord';
import type { Types } from 'mongoose';

/**
 * Normalize a YYYY-MM string or Date to the 1st of that month at UTC midnight.
 */
export function toMonthStart(monthStr: string): Date {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

/**
 * Format a Date as YYYY-MM
 */
export function formatMonth(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export interface AttributionResult {
  agentId: Types.ObjectId;
  agentName?: string;
  callRecord: ICallRecord;
  isExactMonth: boolean;
  matchedMonth: string;
}

/**
 * Core matching logic:
 * 1. Exact month match for (mobileNumber, referenceMonth)
 * 2. Most recent CallRecord before referenceMonth for same number
 * 3. null if no match
 */
export async function resolveAttributedAgent(
  mobileNumber: string,
  referenceMonth: string
): Promise<AttributionResult | null> {
  await connectDB();

  const monthDate = toMonthStart(referenceMonth);

  // Step 1: exact month match
  const exactMatch = await CallRecord.findOne({
    mobileNumber,
    month: monthDate,
  }).populate<{ agent: { _id: Types.ObjectId; name: string } }>('agent', 'name').lean();

  if (exactMatch) {
    return {
      agentId: exactMatch.agent._id,
      agentName: exactMatch.agent.name,
      callRecord: exactMatch as unknown as ICallRecord,
      isExactMonth: true,
      matchedMonth: referenceMonth,
    };
  }

  // Step 2: most recent prior month
  const fallback = await CallRecord.findOne({
    mobileNumber,
    month: { $lt: monthDate },
  })
    .sort({ month: -1 })
    .populate<{ agent: { _id: Types.ObjectId; name: string } }>('agent', 'name')
    .lean();

  if (fallback) {
    return {
      agentId: fallback.agent._id,
      agentName: fallback.agent.name,
      callRecord: fallback as unknown as ICallRecord,
      isExactMonth: false,
      matchedMonth: formatMonth(fallback.month),
    };
  }

  // Step 3: no attribution
  return null;
}
