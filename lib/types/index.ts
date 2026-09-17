// Shared TypeScript types and enums for Newgen Online School

// ── Roles ────────────────────────────────────────────────────
export type UserRole = 'admin' | 'agent';

// ── User Status ───────────────────────────────────────────────
export type UserStatus = 'active' | 'disabled';

// ── Permission Keys ───────────────────────────────────────────
export const Permission = {
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DISABLE: 'users.disable',
  USERS_DELETE: 'users.delete',
  STUDENTS_VIEW: 'students.view',
  STUDENTS_CREATE: 'students.create',
  STUDENTS_EDIT: 'students.edit',
  STUDENTS_DELETE: 'students.delete',
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_CREATE: 'payments.create',
  CALL_RECORDS_VIEW: 'call_records.view',
  CALL_RECORDS_CREATE: 'call_records.create',
  CALL_RECORDS_CORRECT: 'call_records.correct',
  CLAIMS_VIEW: 'claims.view',
  CLAIMS_SUBMIT: 'claims.submit',
  CLAIMS_PROCESS: 'claims.process',
  REPORTS_VIEW: 'reports.view',
  AUDITS_VIEW: 'audits.view',
  LEADERBOARD_VIEW: 'leaderboard.view',
  SETTINGS_GENERAL: 'settings.general',
  SETTINGS_COMMISSION: 'settings.commission',
  SETTINGS_SMTP: 'settings.smtp',
  SETTINGS_CALL_RECORDS: 'settings.call_records',
  SESSIONS_VIEW: 'sessions.view',
  SESSIONS_REVOKE: 'sessions.revoke',
  TARGETS_MANAGE: 'targets.manage',
  NOTIFICATIONS_VIEW: 'notifications.view',
} as const;

export type PermissionKey = typeof Permission[keyof typeof Permission];

// All permissions that an admin has by default
export const ADMIN_PERMISSIONS: PermissionKey[] = Object.values(Permission);

// Default permissions for a newly created agent
export const DEFAULT_AGENT_PERMISSIONS: PermissionKey[] = [
  Permission.CALL_RECORDS_VIEW,
  Permission.CALL_RECORDS_CREATE,
  Permission.STUDENTS_VIEW,
  Permission.CLAIMS_SUBMIT,
  Permission.LEADERBOARD_VIEW,
  Permission.NOTIFICATIONS_VIEW,
];

// ── Call Record ───────────────────────────────────────────────
export type CallOutcome = 'interested' | 'not_interested' | 'call_back_later' | 'no_answer';

export const CALL_OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'call_back_later', label: 'Call Back Later' },
  { value: 'no_answer', label: 'No Answer' },
];

// ── Grade Options (Sri Lankan curriculum) ─────────────────────
export type Grade =
  | 'grade_2' | 'grade_3' | 'grade_4' | 'grade_5'
  | 'grade_6' | 'grade_7' | 'grade_8' | 'grade_9' | 'grade_10' | 'grade_11'
  | 'o_level' | 'a_level';

export const GRADE_OPTIONS: { value: Grade; label: string }[] = [
  { value: 'grade_2', label: 'Grade 2' },
  { value: 'grade_3', label: 'Grade 3' },
  { value: 'grade_4', label: 'Grade 4' },
  { value: 'grade_5', label: 'Grade 5' },
  { value: 'grade_6', label: 'Grade 6' },
  { value: 'grade_7', label: 'Grade 7' },
  { value: 'grade_8', label: 'Grade 8' },
  { value: 'grade_9', label: 'Grade 9' },
  { value: 'grade_10', label: 'Grade 10' },
  { value: 'grade_11', label: 'Grade 11' },
  { value: 'o_level', label: "O'Level" },
  { value: 'a_level', label: "A'Level" },
];

// ── Claim Request ─────────────────────────────────────────────
export type ClaimStatus = 'pending' | 'paid' | 'rejected';

// ── Loyalty Ledger ────────────────────────────────────────────
export type LoyaltyLedgerType = 'earned' | 'claimed';

// ── Credit Point Source ───────────────────────────────────────
export type CreditPointSource = 'registration_match' | 'payment_match';

// ── Audit Log ─────────────────────────────────────────────────
export type AuditAction =
  | 'user.create' | 'user.update' | 'user.disable' | 'user.enable' | 'user.delete'
  | 'user.permission.grant' | 'user.permission.revoke'
  | 'student.create' | 'student.update' | 'student.delete'
  | 'call_record.create' | 'call_record.admin_correct'
  | 'payment.create'
  | 'claim.submit' | 'claim.approve' | 'claim.reject'
  | 'setting.update'
  | 'auth.login' | 'auth.logout' | 'auth.failed_login'
  | 'auth.forgot_password' | 'auth.reset_password'
  | 'session.revoke'
  | 'target.set';

export type AuditEntityType =
  | 'User' | 'Student' | 'CallRecord' | 'PaymentRecord'
  | 'ClaimRequest' | 'Setting' | 'Session' | 'MonthlyTarget';

// ── Notification ──────────────────────────────────────────────
export type NotificationType =
  | 'registration_attributed'
  | 'payment_attributed'
  | 'claim_approved'
  | 'claim_rejected'
  | 'system';

// ── Settings Keys ─────────────────────────────────────────────
export const SettingKey = {
  // Commission
  LOYALTY_AMOUNT_PER_REGISTRATION: 'commission.loyalty_per_registration',
  MIN_CLAIM_AMOUNT: 'commission.min_claim_amount',
  CREDIT_POINTS_REGISTRATION: 'commission.credit_points_registration',
  CREDIT_POINTS_PAYMENT: 'commission.credit_points_payment',
  // Call Records
  PREV_MONTH_GRACE_DAYS: 'call_records.prev_month_grace_days',
  // Session
  SESSION_TIMEOUT_MINUTES: 'auth.session_timeout_minutes',
  // Password Policy
  PASSWORD_MIN_LENGTH: 'auth.password_min_length',
  PASSWORD_REQUIRE_UPPERCASE: 'auth.password_require_uppercase',
  PASSWORD_REQUIRE_NUMBER: 'auth.password_require_number',
  PASSWORD_REQUIRE_SYMBOL: 'auth.password_require_symbol',
  // Login Security
  MAX_LOGIN_ATTEMPTS: 'auth.max_login_attempts',
  LOCKOUT_DURATION_MINUTES: 'auth.lockout_duration_minutes',
  // SMTP
  SMTP_HOST: 'smtp.host',
  SMTP_PORT: 'smtp.port',
  SMTP_SECURE: 'smtp.secure',
  SMTP_USER: 'smtp.user',
  SMTP_PASS: 'smtp.pass',
  SMTP_FROM: 'smtp.from',
  // Branding
  COMPANY_NAME: 'branding.company_name',
  COMPANY_LOGO_URL: 'branding.company_logo_url',
} as const;

export type SettingKeyType = typeof SettingKey[keyof typeof SettingKey];

// Default values for all settings
export const DEFAULT_SETTINGS: Record<SettingKeyType, string> = {
  [SettingKey.LOYALTY_AMOUNT_PER_REGISTRATION]: '100',
  [SettingKey.MIN_CLAIM_AMOUNT]: '5000',
  [SettingKey.CREDIT_POINTS_REGISTRATION]: '10',
  [SettingKey.CREDIT_POINTS_PAYMENT]: '5',
  [SettingKey.PREV_MONTH_GRACE_DAYS]: '5',
  [SettingKey.SESSION_TIMEOUT_MINUTES]: '480',
  [SettingKey.PASSWORD_MIN_LENGTH]: '8',
  [SettingKey.PASSWORD_REQUIRE_UPPERCASE]: 'true',
  [SettingKey.PASSWORD_REQUIRE_NUMBER]: 'true',
  [SettingKey.PASSWORD_REQUIRE_SYMBOL]: 'false',
  [SettingKey.MAX_LOGIN_ATTEMPTS]: '5',
  [SettingKey.LOCKOUT_DURATION_MINUTES]: '15',
  [SettingKey.SMTP_HOST]: '',
  [SettingKey.SMTP_PORT]: '587',
  [SettingKey.SMTP_SECURE]: 'false',
  [SettingKey.SMTP_USER]: '',
  [SettingKey.SMTP_PASS]: '',
  [SettingKey.SMTP_FROM]: '',
  [SettingKey.COMPANY_NAME]: 'Newgen Online School',
  [SettingKey.COMPANY_LOGO_URL]: '',
};

// ── Shared response type ──────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Pagination ────────────────────────────────────────────────
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}
