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

  // Resolve the student record.
  // If a specific studentId is provided (multi-student-per-number scenario), use it directly.
  // Otherwise fall back to the first active student matching the mobile number.
  let student: InstanceType<typeof Student> | null = null;

  if (input.studentId) {
    student = await Student.findById(input.studentId);
    if (!student) {
      throw new Error(`Student not found with id: ${input.studentId}`);
    }
  } else {
    student = await Student.findOne({ mobileNumber: input.mobileNumber, status: 'active' });
    if (!student) {
      // Try inactive too, as a fallback
      student = await Student.findOne({ mobileNumber: input.mobileNumber });
    }
    if (!student) {
      throw new Error(`No student found with mobile number: ${input.mobileNumber}`);
    }
  }

  // Attribution
  const attribution = await resolveAttributedAgent(input.mobileNumber, input.paymentMonth, student.grade);
  const monthDate = toMonthStart(input.paymentMonth);

  // Prevent duplicate payment for same student in the same month
  const existingPayment = await PaymentRecord.findOne({
    student: student._id,
    paymentMonth: monthDate,
  });

  if (existingPayment) {
    const formattedGrade = student.grade.replace(/_/g, ' ');
    throw new Error(
      `A payment record already exists for ${student.name} (${input.mobileNumber}, ${formattedGrade}) for ${input.paymentMonth}. Duplicate payments for the same student and month are not allowed.`
    );
  }

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
 * If studentId is provided, returns info for that specific student.
 */
export async function previewAttribution(mobileNumber: string, month: string, studentId?: string) {
  await connectDB();

  // Find all matching students for this mobile number
  const allStudents = await Student.find({ mobileNumber }).sort({ grade: 1 }).lean();

  let studentDoc: any = null;
  if (studentId) {
    studentDoc = allStudents.find((s) => s._id.toString() === studentId) || await Student.findById(studentId).lean();
  } else if (allStudents.length > 0) {
    studentDoc = allStudents[0];
  }

  const attribution = await resolveAttributedAgent(mobileNumber, month, studentDoc?.grade);

  return {
    student: studentDoc
      ? {
          _id: studentDoc._id,
          name: studentDoc.name,
          grade: studentDoc.grade,
          medium: (studentDoc as any).medium ?? 'sinhala',
          status: studentDoc.status,
        }
      : null,
    students: allStudents.map((s) => ({
      _id: s._id,
      name: s.name,
      grade: s.grade,
      medium: (s as any).medium ?? 'sinhala',
      status: s.status,
    })),
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
