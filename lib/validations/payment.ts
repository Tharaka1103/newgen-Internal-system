import { z } from 'zod';
import { sriLankanMobileSchema } from './phone';

export const CreatePaymentSchema = z.object({
  mobileNumber: sriLankanMobileSchema,
  /** Specific student _id — required when multiple students share the same mobile number. */
  studentId: z.string().optional(),
  amount: z.number({ error: 'Amount must be a number' }).positive('Amount must be positive'),
  paymentMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});

export const AttributionLookupSchema = z.object({
  mobileNumber: sriLankanMobileSchema,
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type AttributionLookupInput = z.infer<typeof AttributionLookupSchema>;
