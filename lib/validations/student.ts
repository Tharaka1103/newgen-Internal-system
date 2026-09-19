import { z } from 'zod';
import { sriLankanMobileSchema } from './phone';

export const GRADE_VALUES = [
  'grade_2', 'grade_3', 'grade_4', 'grade_5',
  'grade_6', 'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11',
  'o_level', 'a_level'
] as const;

export const CreateStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  mobileNumber: sriLankanMobileSchema,
  grade: z.enum(GRADE_VALUES, { message: 'Please select a valid grade' }),
  medium: z.enum(['sinhala', 'english']).default('sinhala'),
  registrationDate: z.string().optional(), // ISO date string
  status: z.enum(['active', 'inactive']).optional(),
});

export const UpdateStudentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  mobileNumber: sriLankanMobileSchema.optional(),
  grade: z.enum(GRADE_VALUES).optional(),
  medium: z.enum(['sinhala', 'english']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  registrationDate: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
