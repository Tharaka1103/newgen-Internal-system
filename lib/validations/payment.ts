import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  mobileNumber: z.string()
    .min(9, 'Mobile number must be at least 9 digits')
    .max(15)
    .regex(/^[0-9+\-\s()]+$/, 'Invalid mobile number format'),
  amount: z.number({ error: 'Amount must be a number' }).positive('Amount must be positive'),
  paymentMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});

export const AttributionLookupSchema = z.object({
  mobileNumber: z.string().min(9).max(15),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type AttributionLookupInput = z.infer<typeof AttributionLookupSchema>;
