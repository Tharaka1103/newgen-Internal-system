import { z } from 'zod';

export const BankDetailsSchema = z.object({
  accountName: z.string().min(2, 'Account name is required').max(100),
  accountNumber: z.string().min(6, 'Account number is required').max(30),
  bankName: z.string().min(2, 'Bank name is required').max(100),
  branchName: z.string().max(100).optional(),
});

export const SubmitClaimSchema = z.object({
  requestedAmount: z.number({ error: 'Amount must be a number' }).positive('Amount must be positive'),
  bankDetails: BankDetailsSchema,
});

export const ProcessClaimSchema = z.object({
  action: z.enum(['approve', 'reject']),
  paidAmount: z.number().positive().optional(),
  adminNote: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.action === 'approve' && !data.paidAmount) return false;
    return true;
  },
  { message: 'Paid amount is required when approving a claim', path: ['paidAmount'] }
);

export type SubmitClaimInput = z.infer<typeof SubmitClaimSchema>;
export type ProcessClaimInput = z.infer<typeof ProcessClaimSchema>;
