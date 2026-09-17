import connectDB from '@/lib/db/mongoose';
import { Student, CreditPoint, LoyaltyLedger } from '@/lib/db/models';
import { resolveAttributedAgent, toMonthStart, formatMonth } from './matching.service';
import { createNotification } from './notification.service';
import { getNumericSetting } from './settings.service';
import { SettingKey } from '@/lib/types';
import type { CreateStudentInput } from '@/lib/validations/student';
import type { Types } from 'mongoose';

interface RegisterStudentParams {
  input: CreateStudentInput & { registrationDate?: string };
  createdBy: Types.ObjectId | string;
  autoCreated?: boolean;
}

interface RegisterStudentResult {
  student: InstanceType<typeof Student>;
  isNew: boolean;
  attributedAgentId?: Types.ObjectId;
  creditPointsAwarded: number;
  loyaltyPointsAwarded: number;
}

/**
 * Register a student (create if new) and run the attribution + reward logic.
 * - If new + attributed: CreditPoints + Rs.100 LoyaltyPoints
 * - If existing + attributed: CreditPoints only
 * - If no attribution: no points
 */
export async function registerStudent(params: RegisterStudentParams): Promise<RegisterStudentResult> {
  await connectDB();

  const { input, createdBy, autoCreated = false } = params;

  // Determine if student already exists
  const existingStudent = await Student.findOne({ mobileNumber: input.mobileNumber });
  const isNew = !existingStudent;

  let student: InstanceType<typeof Student>;

  if (isNew) {
    student = await Student.create({
      name: input.name,
      mobileNumber: input.mobileNumber,
      grade: input.grade,
      registrationDate: input.registrationDate ? new Date(input.registrationDate) : new Date(),
      status: 'active',
      autoCreated,
      createdBy,
    });
  } else {
    student = existingStudent!;
    // Update grade/name if provided and different
    if (input.name !== student.name || input.grade !== student.grade) {
      student.name = input.name;
      student.grade = input.grade;
      await student.save();
    }
  }

  // Attribution
  const registrationDate = student.registrationDate;
  const referenceMonth = formatMonth(registrationDate);
  const attribution = await resolveAttributedAgent(input.mobileNumber, referenceMonth);

  let creditPointsAwarded = 0;
  let loyaltyPointsAwarded = 0;

  if (attribution) {
    const creditPointValue = await getNumericSetting(SettingKey.CREDIT_POINTS_REGISTRATION);
    const monthDate = toMonthStart(referenceMonth);

    // Award CreditPoints
    await CreditPoint.create({
      agent: attribution.agentId,
      source: 'registration_match',
      referenceId: student._id,
      referenceModel: 'Student',
      amount: creditPointValue,
      month: monthDate,
    });
    creditPointsAwarded = creditPointValue;

    // Award LoyaltyPoints (Rs. 100) only for NEW students
    if (isNew) {
      const loyaltyAmount = await getNumericSetting(SettingKey.LOYALTY_AMOUNT_PER_REGISTRATION);
      await LoyaltyLedger.create({
        agent: attribution.agentId,
        type: 'earned',
        amount: loyaltyAmount,
        referenceId: student._id,
        referenceModel: 'Student',
        description: `New student registration: ${input.mobileNumber}`,
      });
      loyaltyPointsAwarded = loyaltyAmount;

      // Notify the agent
      await createNotification({
        recipientId: attribution.agentId,
        type: 'registration_attributed',
        title: 'New Registration Attributed!',
        message: `A new student (${input.mobileNumber}) registered and was attributed to you. You earned Rs. ${loyaltyAmount} loyalty points.`,
        referenceId: student._id,
        entityType: 'Student',
      });
    } else {
      await createNotification({
        recipientId: attribution.agentId,
        type: 'registration_attributed',
        title: 'Registration Attributed',
        message: `Student ${input.mobileNumber} registered. You earned ${creditPointValue} credit points.`,
        referenceId: student._id,
        entityType: 'Student',
      });
    }
  }

  return {
    student,
    isNew,
    attributedAgentId: attribution?.agentId,
    creditPointsAwarded,
    loyaltyPointsAwarded,
  };
}
