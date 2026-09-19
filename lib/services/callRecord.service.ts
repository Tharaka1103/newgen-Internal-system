import connectDB from '@/lib/db/mongoose';
import { CallRecord } from '@/lib/db/models';
import { toMonthStart } from './matching.service';
import { getNumericSetting } from './settings.service';
import { SettingKey } from '@/lib/types';
import type { CreateCallRecordInput, AdminCorrectCallRecordInput } from '@/lib/validations/call-record';
import type { Types } from 'mongoose';

/**
 * Check if a given month string is currently open for call record creation.
 * Current month is always open.
 * Previous month is open for PREV_MONTH_GRACE_DAYS days after month end.
 */
export async function isMonthOpenForAgent(monthStr: string): Promise<boolean> {
  const graceDays = await getNumericSetting(SettingKey.PREV_MONTH_GRACE_DAYS);
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const targetMonthStart = toMonthStart(monthStr);

  // Current month — always open
  if (targetMonthStart.getTime() === currentMonthStart.getTime()) return true;

  // Previous month — open if within grace days
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  if (targetMonthStart.getTime() === prevMonthStart.getTime()) {
    // The day of the current month (e.g. 3rd day of October means 3 grace days used for September)
    const dayOfCurrentMonth = now.getUTCDate();
    return dayOfCurrentMonth <= graceDays;
  }

  return false;
}

/**
 * Create a call record (agent action — immutable once created).
 */
export async function createCallRecord(
  agentId: Types.ObjectId | string,
  input: CreateCallRecordInput
): Promise<InstanceType<typeof CallRecord>> {
  await connectDB();

  // Check month is open
  const isOpen = await isMonthOpenForAgent(input.month);
  if (!isOpen) {
    throw new Error(`The month ${input.month} is no longer open for new call records.`);
  }

  const monthDate = toMonthStart(input.month);

  function formatGradeLabel(g: string): string {
    return g.replace(/^grade_/, 'Grade ').replace('o_level', 'O/Level').replace('a_level', 'A/Level');
  }

  // Pre-check for duplicate (mobileNumber, grade, month)
  const existing = await CallRecord.findOne({
    mobileNumber: input.mobileNumber,
    grade: input.grade,
    month: monthDate,
  });
  if (existing) {
    throw new Error(
      `A call record already exists for mobile number ${input.mobileNumber} and ${formatGradeLabel(input.grade)} in ${input.month}. Only one call record per number and grade per month is allowed.`
    );
  }

  try {
    const record = await CallRecord.create({
      mobileNumber: input.mobileNumber,
      grade: input.grade,
      month: monthDate,
      agent: agentId,
      outcome: input.outcome,
      notes: input.notes,
    });
    return record;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      throw new Error(
        `A call record already exists for mobile number ${input.mobileNumber} and ${formatGradeLabel(input.grade)} in ${input.month}. Only one call record per number and grade per month is allowed.`
      );
    }
    throw error;
  }
}

/**
 * Admin correction of a call record — all fields editable, original snapshot preserved in AuditLog.
 */
export async function adminCorrectCallRecord(
  recordId: string,
  input: AdminCorrectCallRecordInput,
  adminId: Types.ObjectId | string
): Promise<{ record: InstanceType<typeof CallRecord>; before: Record<string, unknown> }> {
  await connectDB();

  const record = await CallRecord.findById(recordId);
  if (!record) throw new Error('Call record not found');

  // Capture before snapshot
  const before: Record<string, unknown> = {
    mobileNumber: record.mobileNumber,
    grade: record.grade,
    month: record.month,
    outcome: record.outcome,
    notes: record.notes,
  };

  // Apply changes
  if (input.mobileNumber !== undefined) record.mobileNumber = input.mobileNumber;
  if (input.grade !== undefined) record.grade = input.grade;
  if (input.month !== undefined) record.month = toMonthStart(input.month);
  if (input.outcome !== undefined) record.outcome = input.outcome;
  if (input.notes !== undefined) record.notes = input.notes;

  record.correctedBy = adminId as Types.ObjectId;
  record.correctedAt = new Date();

  try {
    await record.save();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      throw new Error('A call record already exists for that mobile number, grade, and month combination.');
    }
    throw error;
  }

  return { record, before };
}
