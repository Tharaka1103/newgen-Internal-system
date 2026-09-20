import connectDB from '@/lib/db/mongoose';
import { CallRecord, Student, PaymentRecord, CreditPoint, LoyaltyLedger } from '@/lib/db/models';
import { toMonthStart, formatMonth } from './matching.service';
import { getNumericSetting } from './settings.service';
import { createNotification } from './notification.service';
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
 * Create a call record (agent action — immutable once created, unless admin grants edit permission).
 * Also retroactively backfills attribution for pre-existing students and payments.
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

    // Retroactively attribute pre-existing students and payments for this mobile & grade
    await backfillAttributionForCallRecord(record);

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
 * Retroactively attributes existing Student registrations and PaymentRecords
 * that were created before this call record was logged.
 */
export async function backfillAttributionForCallRecord(
  record: InstanceType<typeof CallRecord>
): Promise<{ attributedStudents: number; attributedPayments: number }> {
  const callMonthStr = formatMonth(record.month);
  const callMonthDate = toMonthStart(callMonthStr);

  let attributedStudents = 0;
  let attributedPayments = 0;

  // 1. Backfill Student Registration Attribution
  const student = await Student.findOne({
    mobileNumber: record.mobileNumber,
    grade: record.grade,
  });

  if (student) {
    const regMonthStr = formatMonth(student.registrationDate);
    const regMonthDate = toMonthStart(regMonthStr);

    // If student registered in this call record's month or a subsequent month
    if (regMonthDate.getTime() >= callMonthDate.getTime()) {
      const existingCredit = await CreditPoint.findOne({
        source: 'registration_match',
        referenceId: student._id,
      });

      if (!existingCredit) {
        const creditPointValue = await getNumericSetting(SettingKey.CREDIT_POINTS_REGISTRATION);
        await CreditPoint.create({
          agent: record.agent,
          source: 'registration_match',
          referenceId: student._id,
          referenceModel: 'Student',
          amount: creditPointValue,
          month: regMonthDate,
        });

        // Award LoyaltyLedger for new student if not already awarded
        const existingLoyalty = await LoyaltyLedger.findOne({
          referenceId: student._id,
          referenceModel: 'Student',
          type: 'earned',
        });

        if (!existingLoyalty) {
          const loyaltyAmount = await getNumericSetting(SettingKey.LOYALTY_AMOUNT_PER_REGISTRATION);
          await LoyaltyLedger.create({
            agent: record.agent,
            type: 'earned',
            amount: loyaltyAmount,
            referenceId: student._id,
            referenceModel: 'Student',
            description: `New student registration (retroactive match): ${record.mobileNumber}`,
          });

          await createNotification({
            recipientId: record.agent,
            type: 'registration_attributed',
            title: 'Registration Attributed (Backfilled)!',
            message: `A student (${record.mobileNumber}) registered in ${regMonthStr} has been matched to your call record. You earned Rs. ${loyaltyAmount} loyalty points and ${creditPointValue} credit points.`,
            referenceId: student._id,
            entityType: 'Student',
          });
        } else {
          await createNotification({
            recipientId: record.agent,
            type: 'registration_attributed',
            title: 'Registration Attributed (Backfilled)!',
            message: `Student (${record.mobileNumber}) registered in ${regMonthStr} has been matched to your call record. You earned ${creditPointValue} credit points.`,
            referenceId: student._id,
            entityType: 'Student',
          });
        }

        attributedStudents++;
      }
    }
  }

  // 2. Backfill Payment Records Attribution
  const unattributedPayments = await PaymentRecord.find({
    mobileNumber: record.mobileNumber,
    $or: [{ attributedAgent: { $exists: false } }, { attributedAgent: null }],
  });

  for (const payment of unattributedPayments) {
    if (student && payment.student && payment.student.toString() !== student._id.toString()) {
      continue;
    }

    const payMonthDate = toMonthStart(formatMonth(payment.paymentMonth));
    if (payMonthDate.getTime() >= callMonthDate.getTime()) {
      const creditPointValue = await getNumericSetting(SettingKey.CREDIT_POINTS_PAYMENT);

      await CreditPoint.create({
        agent: record.agent,
        source: 'payment_match',
        referenceId: payment._id,
        referenceModel: 'PaymentRecord',
        amount: creditPointValue,
        month: payment.paymentMonth,
      });

      payment.attributedAgent = record.agent as Types.ObjectId;
      payment.creditPointsAwarded = creditPointValue;
      await payment.save();

      await createNotification({
        recipientId: record.agent,
        type: 'payment_attributed',
        title: 'Payment Attributed (Backfilled)!',
        message: `A payment of Rs. ${payment.amount} for ${payment.mobileNumber} was matched to your call record. You earned ${creditPointValue} credit points.`,
        referenceId: payment._id,
        entityType: 'PaymentRecord',
      });

      attributedPayments++;
    }
  }

  return { attributedStudents, attributedPayments };
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
