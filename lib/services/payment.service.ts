import connectDB from '@/lib/db/mongoose';
import { Student, PaymentRecord, CreditPoint } from '@/lib/db/models';
import { resolveAttributedAgent, toMonthStart } from './matching.service';
import { createNotification } from './notification.service';
import { getNumericSetting } from './settings.service';
import { SettingKey } from '@/lib/types';
import type { CreatePaymentInput } from '@/lib/validations/payment';
import type { Types } from 'mongoose';

interface CreatePaymentResult {
  payment: InstanceType<typeof PaymentRecord>;
  attributedAgentId?: Types.ObjectId;
  creditPointsAwarded: number;
}

export async function createPayment(
  input: CreatePaymentInput,
  createdBy: Types.ObjectId | string
): Promise<CreatePaymentResult> {
  await connectDB();

  // Find student by mobile number
  const student = await Student.findOne({ mobileNumber: input.mobileNumber });
  if (!student) {
    throw new Error(`No student found with mobile number: ${input.mobileNumber}`);
  }

  // Attribution
  const attribution = await resolveAttributedAgent(input.mobileNumber, input.paymentMonth);
  const monthDate = toMonthStart(input.paymentMonth);

  let creditPointsAwarded = 0;

  // Create payment record
  const payment = await PaymentRecord.create({
    student: student._id,
    mobileNumber: input.mobileNumber,
    amount: input.amount,
    paymentMonth: monthDate,
    attributedAgent: attribution?.agentId,
    creditPointsAwarded: 0,
    createdBy,
  });

  if (attribution) {
    const creditPointValue = await getNumericSetting(SettingKey.CREDIT_POINTS_PAYMENT);

    await CreditPoint.create({
      agent: attribution.agentId,
      source: 'payment_match',
      referenceId: payment._id,
      referenceModel: 'PaymentRecord',
      amount: creditPointValue,
      month: monthDate,
    });
    creditPointsAwarded = creditPointValue;

    // Update the payment record with actual credit points
    payment.creditPointsAwarded = creditPointValue;
    await payment.save();

    // Notify the agent (CreditPoints only — no loyalty money for payments)
    await createNotification({
      recipientId: attribution.agentId,
      type: 'payment_attributed',
      title: 'Payment Attributed',
      message: `A payment of Rs. ${input.amount} for ${input.mobileNumber} was attributed to you. You earned ${creditPointValue} credit points.`,
      referenceId: payment._id,
      entityType: 'PaymentRecord',
    });
  }

  return {
    payment,
    attributedAgentId: attribution?.agentId,
    creditPointsAwarded,
  };
}

/**
 * Preview attribution without creating a payment.
 * Used for the live attribution indicator on the payment form.
 */
export async function previewAttribution(mobileNumber: string, month: string) {
  await connectDB();

  const student = await Student.findOne({ mobileNumber }).lean();
  const attribution = await resolveAttributedAgent(mobileNumber, month);

  return {
    student: student
      ? {
          _id: student._id,
          name: student.name,
          grade: student.grade,
          medium: (student as any).medium ?? 'sinhala',
          status: student.status,
        }
      : null,
    attribution: attribution
      ? {
          agentId: attribution.agentId,
          agentName: attribution.agentName,
          isExactMonth: attribution.isExactMonth,
          matchedMonth: attribution.matchedMonth,
        }
      : null,
  };
}
