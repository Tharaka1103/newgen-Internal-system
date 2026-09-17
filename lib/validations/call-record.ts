import { z } from 'zod';

const GRADE_VALUES = [
  'grade_2', 'grade_3', 'grade_4', 'grade_5',
  'grade_6', 'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11',
  'o_level', 'a_level'
] as const;
const OUTCOME_VALUES = ['interested', 'not_interested', 'call_back_later', 'no_answer'] as const;

export const CreateCallRecordSchema = z.object({
  mobileNumber: z.string()
    .min(9, 'Mobile number must be at least 9 digits')
    .max(15)
    .regex(/^[0-9+\-\s()]+$/, 'Invalid mobile number format'),
  grade: z.enum(GRADE_VALUES, { message: 'Please select a valid grade' }),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  outcome: z.enum(OUTCOME_VALUES, { message: 'Please select an outcome' }),
  notes: z.string().max(1000).optional(),
});

export const AdminCorrectCallRecordSchema = z.object({
  mobileNumber: z.string().min(9).max(15).regex(/^[0-9+\-\s()]+$/).optional(),
  grade: z.enum(GRADE_VALUES).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  outcome: z.enum(OUTCOME_VALUES).optional(),
  notes: z.string().max(1000).optional(),
  correctionReason: z.string().min(1, 'Correction reason is required').max(500),
});

export type CreateCallRecordInput = z.infer<typeof CreateCallRecordSchema>;
export type AdminCorrectCallRecordInput = z.infer<typeof AdminCorrectCallRecordSchema>;
