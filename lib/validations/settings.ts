import { z } from 'zod';

export const UpdateSettingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string(),
});

export const UpdateMultipleSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string().min(1),
    value: z.string(),
  })).min(1, 'At least one setting is required'),
});

export const SetMonthlyTargetSchema = z.object({
  agentId: z.string().min(1, 'Agent is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  callTarget: z.number({ error: 'Target must be a number' }).int().positive('Target must be a positive integer'),
});

export type UpdateSettingInput = z.infer<typeof UpdateSettingSchema>;
export type UpdateMultipleSettingsInput = z.infer<typeof UpdateMultipleSettingsSchema>;
export type SetMonthlyTargetInput = z.infer<typeof SetMonthlyTargetSchema>;
