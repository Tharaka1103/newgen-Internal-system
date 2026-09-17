import { z } from 'zod';

export const GRADE_VALUES = [
  'grade_2', 'grade_3', 'grade_4', 'grade_5',
  'grade_6', 'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11',
  'o_level', 'a_level'
] as const;

export const CreateStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  mobileNumber: z.string()
    .min(9, 'Mobile number must be at least 9 digits')
    .max(15, 'Mobile number too long')
    .regex(/^[0-9+\-\s()]+$/, 'Invalid mobile number format'),
  grade: z.enum(GRADE_VALUES, { message: 'Please select a valid grade' }),
  registrationDate: z.string().optional(), // ISO date string
  status: z.enum(['active', 'inactive']).optional(),
});

export const UpdateStudentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  mobileNumber: z.string()
    .min(9, 'Mobile number must be at least 9 digits')
    .max(15, 'Mobile number too long')
    .regex(/^[0-9+\-\s()]+$/, 'Invalid mobile number format')
    .optional(),
  grade: z.enum(GRADE_VALUES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  registrationDate: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
