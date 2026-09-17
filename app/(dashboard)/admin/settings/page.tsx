'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  User,
  KeyRound,
  AlertTriangle,
  ShieldAlert,
  Building,
  Coins,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { SettingKey, DEFAULT_SETTINGS, type SettingKeyType } from '@/lib/types';

type Settings = Record<SettingKeyType, string>;

function useSettings() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success) setSettings(data.data);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key: SettingKeyType, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = async (keys: SettingKeyType[]) => {
    setError(null);
    setIsSaving(true);
    const payload = keys.map((key) => ({ key, value: settings[key] }));
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: payload }),
    });
    const data = await res.json();
    setIsSaving(false);
    if (data.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(data.error);
    }
  };

  return { settings, update, save, isLoading, isSaving, saved, error };
}

function SaveButton({ onClick, isSaving, saved }: { onClick: () => void; isSaving: boolean; saved: boolean }) {
  return (
    <Button onClick={onClick} disabled={isSaving} size="sm" id="save-settings-btn" className="h-8 text-xs">
      {saved ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Saved
        </>
      ) : isSaving ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving
        </>
      ) : (
        'Save Changes'
      )}
    </Button>
  );
}

export default function AdminSettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { settings, update, save, isLoading, isSaving, saved, error } = useSettings();
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);

  // ── Profile Form State ──────────────────────────────────────────
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ── Password Form State ─────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ── Retire Account Dialog State ─────────────────────────────────
  const [isRetireDialogOpen, setIsRetireDialogOpen] = useState(false);
  const [retirePassword, setRetirePassword] = useState('');
  const [retireConfirmText, setRetireConfirmText] = useState('');
  const [isRetiring, setIsRetiring] = useState(false);
  const [retireError, setRetireError] = useState<string | null>(null);

  // Initialize Profile data from API/session
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/users/profile');
        const json = await res.json();
        if (json.success) {
          setProfileName(json.data.name || '');
          setProfileEmail(json.data.email || '');
        } else if (session?.user) {
          setProfileName(session.user.name || '');
          setProfileEmail(session.user.email || '');
        }
      } catch {
        if (session?.user) {
          setProfileName(session.user.name || '');
          setProfileEmail(session.user.email || '');
        }
      }
    }
    loadProfile();
  }, [session]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setIsSavingProfile(true);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'profile',
          name: profileName.trim(),
          email: profileEmail.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setProfileError(json.error || 'Failed to update profile.');
        return;
      }

      setProfileSuccess('Profile details updated successfully.');
      if (updateSession) {
        await updateSession({ name: profileName.trim(), email: profileEmail.trim() });
      }
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please re-enter.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'password',
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setPasswordError(json.error || 'Failed to update password.');
        return;
      }

      setPasswordSuccess('Password has been successfully changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 3500);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle Admin Account Retirement (Self-Deletion)
  const handleConfirmRetire = async () => {
    setRetireError(null);
    if (!retirePassword) {
      setRetireError('Please enter your password to confirm retirement.');
      return;
    }
    if (retireConfirmText !== 'RETIRE') {
      setRetireError('Please type RETIRE in capital letters to confirm.');
      return;
    }

    setIsRetiring(true);
    try {
      const res = await fetch('/api/users/profile/retire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: retirePassword,
          confirmationText: retireConfirmText,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setRetireError(json.error || 'Failed to retire account.');
        return;
      }

      // Successful retirement -> log out immediately
      setIsRetireDialogOpen(false);
      await signOut({ callbackUrl: '/login?retired=true' });
    } catch (err) {
      setRetireError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setIsRetiring(false);
    }
  };

  const testSmtp = async () => {
    setSmtpTestResult('Sending test email...');
    try {
      const res = await fetch('/api/settings/smtp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: settings[SettingKey.SMTP_USER] }),
      });
      const data = await res.json();
      setSmtpTestResult(data.success ? '✓ Test email sent successfully!' : `Error: ${data.error}`);
    } catch {
      setSmtpTestResult('Failed to send test email');
    }
    setTimeout(() => setSmtpTestResult(null), 5000);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-xs text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Settings"
        description="Manage your administrator profile, security credentials, and system configurations"
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="account" className="space-y-5">
        <TabsList className="h-9 flex flex-wrap w-full sm:w-auto justify-start bg-muted/40 p-1 border">
          <TabsTrigger value="account" className="text-xs px-3 gap-1.5">
            <User className="h-3.5 w-3.5" />
            My Account & Security
          </TabsTrigger>
          <TabsTrigger value="general" className="text-xs px-3 gap-1.5">
            <Building className="h-3.5 w-3.5" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="commission" className="text-xs px-3 gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            Rewards & Limits
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs px-3 gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            System Policies
          </TabsTrigger>
          <TabsTrigger value="smtp" className="text-xs px-3 gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            SMTP Mail
          </TabsTrigger>
        </TabsList>

        {/* ── 1. ACCOUNT & PERSONAL SECURITY TAB ───────────────────── */}
        <TabsContent value="account" className="space-y-6 mt-4">
          {/* Profile Details Card */}
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Administrator Profile
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Update your display name and registered email address
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-[11px] font-mono capitalize">
                  Administrator
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-name" className="text-xs font-semibold">
                      Full Name *
                    </Label>
                    <Input
                      id="profile-name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. John Silva"
                      className="h-8 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-email" className="text-xs font-semibold">
                      Email Address *
                    </Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="admin@newgen.com"
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                </div>

                {profileSuccess && (
                  <div className="p-2.5 rounded-md bg-emerald-500/10 text-emerald-600 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    size="sm"
                    className="h-8 text-xs shadow-xs"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving
                      </>
                    ) : (
                      'Save Profile Details'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Ensure your account is protected with a strong, secure password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="space-y-1.5 max-w-md">
                  <Label htmlFor="current-password" className="text-xs font-semibold">
                    Current Password *
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-xs font-semibold">
                      New Password *
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="h-8 text-xs"
                      minLength={8}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs font-semibold">
                      Confirm New Password *
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="h-8 text-xs"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="p-2.5 rounded-md bg-emerald-500/10 text-emerald-600 text-xs flex items-center gap-2 max-w-xl">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs flex items-center gap-2 max-w-xl">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="flex justify-end max-w-xl">
                  <Button
                    type="submit"
                    disabled={isSavingPassword}
                    size="sm"
                    className="h-8 text-xs shadow-xs"
                  >
                    {isSavingPassword ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Updating
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ── DANGER ZONE: RETIRE ADMINISTRATOR ACCOUNT ───────────── */}
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-sm font-semibold text-destructive">
                  Danger Zone
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Irreversible actions regarding your administrator account and system access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg border border-destructive/20 bg-background">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    Retire Administrator Account
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-md">
                    Permanently delete your administrator account, active sessions, and access credentials from the Newgen School system.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setRetirePassword('');
                    setRetireConfirmText('');
                    setRetireError(null);
                    setIsRetireDialogOpen(true);
                  }}
                  className="h-8 text-xs font-semibold shrink-0"
                >
                  <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                  Retire Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 2. GENERAL (BRANDING) TAB ────────────────────────────── */}
        <TabsContent value="general" className="mt-4 space-y-5">
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Branding Configuration</CardTitle>
              <CardDescription className="text-xs">
                Organization details displayed in portal headers and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="setting-company-name" className="text-xs font-semibold">
                  Company / School Name
                </Label>
                <Input
                  id="setting-company-name"
                  value={settings[SettingKey.COMPANY_NAME]}
                  onChange={(e) => update(SettingKey.COMPANY_NAME, e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-logo-url" className="text-xs font-semibold">
                  Logo URL
                </Label>
                <Input
                  id="setting-logo-url"
                  value={settings[SettingKey.COMPANY_LOGO_URL]}
                  onChange={(e) => update(SettingKey.COMPANY_LOGO_URL, e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <SaveButton
              onClick={() => save([SettingKey.COMPANY_NAME, SettingKey.COMPANY_LOGO_URL])}
              isSaving={isSaving}
              saved={saved}
            />
          </div>
        </TabsContent>

        {/* ── 3. COMMISSION & REWARDS TAB ──────────────────────────── */}
        <TabsContent value="commission" className="mt-4 space-y-5">
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Reward & Attribution Configuration</CardTitle>
              <CardDescription className="text-xs">
                Rules governing agent cash incentives, credit points, and claim minimums
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setting-loyalty-per-reg" className="text-xs font-semibold">
                    Loyalty Cash Per New Registration (Rs.)
                  </Label>
                  <Input
                    id="setting-loyalty-per-reg"
                    type="number"
                    value={settings[SettingKey.LOYALTY_AMOUNT_PER_REGISTRATION]}
                    onChange={(e) => update(SettingKey.LOYALTY_AMOUNT_PER_REGISTRATION, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="setting-min-claim" className="text-xs font-semibold">
                    Minimum Cash Claim Amount (Rs.)
                  </Label>
                  <Input
                    id="setting-min-claim"
                    type="number"
                    value={settings[SettingKey.MIN_CLAIM_AMOUNT]}
                    onChange={(e) => update(SettingKey.MIN_CLAIM_AMOUNT, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setting-credit-reg" className="text-xs font-semibold">
                    CreditPoints Per Registration Match
                  </Label>
                  <Input
                    id="setting-credit-reg"
                    type="number"
                    value={settings[SettingKey.CREDIT_POINTS_REGISTRATION]}
                    onChange={(e) => update(SettingKey.CREDIT_POINTS_REGISTRATION, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="setting-credit-pay" className="text-xs font-semibold">
                    CreditPoints Per Payment Match
                  </Label>
                  <Input
                    id="setting-credit-pay"
                    type="number"
                    value={settings[SettingKey.CREDIT_POINTS_PAYMENT]}
                    onChange={(e) => update(SettingKey.CREDIT_POINTS_PAYMENT, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="setting-grace-days" className="text-xs font-semibold">
                  Previous Month Call Grace Period (Days)
                </Label>
                <Input
                  id="setting-grace-days"
                  type="number"
                  value={settings[SettingKey.PREV_MONTH_GRACE_DAYS]}
                  onChange={(e) => update(SettingKey.PREV_MONTH_GRACE_DAYS, e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Days into a new month during which agents can still log outreach for the previous month.
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <SaveButton
              onClick={() =>
                save([
                  SettingKey.LOYALTY_AMOUNT_PER_REGISTRATION,
                  SettingKey.MIN_CLAIM_AMOUNT,
                  SettingKey.CREDIT_POINTS_REGISTRATION,
                  SettingKey.CREDIT_POINTS_PAYMENT,
                  SettingKey.PREV_MONTH_GRACE_DAYS,
                ])
              }
              isSaving={isSaving}
              saved={saved}
            />
          </div>
        </TabsContent>

        {/* ── 4. SECURITY POLICIES TAB ─────────────────────────────── */}
        <TabsContent value="security" className="mt-4 space-y-5">
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Session & Login Limits</CardTitle>
              <CardDescription className="text-xs">
                Authentication protection and lockout thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setting-session-timeout" className="text-xs font-semibold">
                    Session Timeout (Mins)
                  </Label>
                  <Input
                    id="setting-session-timeout"
                    type="number"
                    value={settings[SettingKey.SESSION_TIMEOUT_MINUTES]}
                    onChange={(e) => update(SettingKey.SESSION_TIMEOUT_MINUTES, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="setting-max-attempts" className="text-xs font-semibold">
                    Max Login Attempts
                  </Label>
                  <Input
                    id="setting-max-attempts"
                    type="number"
                    value={settings[SettingKey.MAX_LOGIN_ATTEMPTS]}
                    onChange={(e) => update(SettingKey.MAX_LOGIN_ATTEMPTS, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="setting-lockout-duration" className="text-xs font-semibold">
                    Lockout Duration (Mins)
                  </Label>
                  <Input
                    id="setting-lockout-duration"
                    type="number"
                    value={settings[SettingKey.LOCKOUT_DURATION_MINUTES]}
                    onChange={(e) => update(SettingKey.LOCKOUT_DURATION_MINUTES, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Password Complexity Policy</CardTitle>
              <CardDescription className="text-xs">
                Enforce rules for passwords created across the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="setting-pwd-min-length" className="text-xs font-semibold">
                  Minimum Password Length
                </Label>
                <Input
                  id="setting-pwd-min-length"
                  type="number"
                  value={settings[SettingKey.PASSWORD_MIN_LENGTH]}
                  onChange={(e) => update(SettingKey.PASSWORD_MIN_LENGTH, e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="setting-pwd-uppercase" className="text-xs">
                  Require Uppercase Letter (A-Z)
                </Label>
                <Switch
                  id="setting-pwd-uppercase"
                  checked={settings[SettingKey.PASSWORD_REQUIRE_UPPERCASE] === 'true'}
                  onCheckedChange={(v) => update(SettingKey.PASSWORD_REQUIRE_UPPERCASE, String(v))}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="setting-pwd-number" className="text-xs">
                  Require Number (0-9)
                </Label>
                <Switch
                  id="setting-pwd-number"
                  checked={settings[SettingKey.PASSWORD_REQUIRE_NUMBER] === 'true'}
                  onCheckedChange={(v) => update(SettingKey.PASSWORD_REQUIRE_NUMBER, String(v))}
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="setting-pwd-symbol" className="text-xs">
                  Require Special Symbol (@, #, $, etc.)
                </Label>
                <Switch
                  id="setting-pwd-symbol"
                  checked={settings[SettingKey.PASSWORD_REQUIRE_SYMBOL] === 'true'}
                  onCheckedChange={(v) => update(SettingKey.PASSWORD_REQUIRE_SYMBOL, String(v))}
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <SaveButton
              onClick={() =>
                save([
                  SettingKey.SESSION_TIMEOUT_MINUTES,
                  SettingKey.MAX_LOGIN_ATTEMPTS,
                  SettingKey.LOCKOUT_DURATION_MINUTES,
                  SettingKey.PASSWORD_MIN_LENGTH,
                  SettingKey.PASSWORD_REQUIRE_UPPERCASE,
                  SettingKey.PASSWORD_REQUIRE_NUMBER,
                  SettingKey.PASSWORD_REQUIRE_SYMBOL,
                ])
              }
              isSaving={isSaving}
              saved={saved}
            />
          </div>
        </TabsContent>

        {/* ── 5. SMTP MAIL TAB ─────────────────────────────────────── */}
        <TabsContent value="smtp" className="mt-4 space-y-5">
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">SMTP Email Server</CardTitle>
              <CardDescription className="text-xs">
                Outbound mail delivery for password resets and critical system notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setting-smtp-host" className="text-xs font-semibold">
                    SMTP Host
                  </Label>
                  <Input
                    id="setting-smtp-host"
                    value={settings[SettingKey.SMTP_HOST]}
                    onChange={(e) => update(SettingKey.SMTP_HOST, e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="setting-smtp-port" className="text-xs font-semibold">
                      Port
                    </Label>
                    <Input
                      id="setting-smtp-port"
                      type="number"
                      value={settings[SettingKey.SMTP_PORT]}
                      onChange={(e) => update(SettingKey.SMTP_PORT, e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between pb-1.5">
                    <Label htmlFor="setting-smtp-secure" className="text-xs">
                      SSL/TLS
                    </Label>
                    <Switch
                      id="setting-smtp-secure"
                      checked={settings[SettingKey.SMTP_SECURE] === 'true'}
                      onCheckedChange={(v) => update(SettingKey.SMTP_SECURE, String(v))}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setting-smtp-user" className="text-xs font-semibold">
                    SMTP Username / Email
                  </Label>
                  <Input
                    id="setting-smtp-user"
                    value={settings[SettingKey.SMTP_USER]}
                    onChange={(e) => update(SettingKey.SMTP_USER, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="setting-smtp-pass" className="text-xs font-semibold">
                    SMTP App Password
                  </Label>
                  <Input
                    id="setting-smtp-pass"
                    type="password"
                    value={settings[SettingKey.SMTP_PASS]}
                    onChange={(e) => update(SettingKey.SMTP_PASS, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-smtp-from" className="text-xs font-semibold">
                  From Email Display
                </Label>
                <Input
                  id="setting-smtp-from"
                  value={settings[SettingKey.SMTP_FROM]}
                  onChange={(e) => update(SettingKey.SMTP_FROM, e.target.value)}
                  placeholder='Newgen School <noreply@newgen-school.com>'
                  className="h-8 text-xs"
                />
              </div>

              {smtpTestResult && (
                <Alert className="text-xs">
                  <AlertDescription>{smtpTestResult}</AlertDescription>
                </Alert>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={testSmtp}
                id="test-smtp-btn"
                className="h-8 text-xs gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Send Test Email
              </Button>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <SaveButton
              onClick={() =>
                save([
                  SettingKey.SMTP_HOST,
                  SettingKey.SMTP_PORT,
                  SettingKey.SMTP_SECURE,
                  SettingKey.SMTP_USER,
                  SettingKey.SMTP_PASS,
                  SettingKey.SMTP_FROM,
                ])
              }
              isSaving={isSaving}
              saved={saved}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── RETIRE ACCOUNT CONFIRMATION DIALOG ────────────────────── */}
      <Dialog open={isRetireDialogOpen} onOpenChange={setIsRetireDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Retire Administrator Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This action is permanent and cannot be undone. Please read the warnings below carefully.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Warning Callout */}
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive space-y-1.5">
              <p className="font-semibold text-xs flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                Permanent Account Deletion Warning
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-destructive/90">
                <li>Your administrator account will be immediately deleted from the database.</li>
                <li>All active sessions on all devices will be immediately terminated.</li>
                <li>You will lose all access to Newgen School management portal.</li>
                <li>The system will prevent retirement if you are the only remaining active administrator.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="retire-password" className="text-xs font-semibold">
                Confirm Your Current Password *
              </Label>
              <Input
                id="retire-password"
                type="password"
                value={retirePassword}
                onChange={(e) => setRetirePassword(e.target.value)}
                placeholder="Enter your password"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="retire-confirm-text" className="text-xs font-semibold">
                Type <span className="font-mono text-destructive font-bold">RETIRE</span> to confirm *
              </Label>
              <Input
                id="retire-confirm-text"
                type="text"
                value={retireConfirmText}
                onChange={(e) => setRetireConfirmText(e.target.value)}
                placeholder="RETIRE"
                className="h-8 text-xs font-mono"
                required
              />
            </div>

            {retireError && (
              <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{retireError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRetireDialogOpen(false)}
              disabled={isRetiring}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmRetire}
              disabled={isRetiring || retireConfirmText !== 'RETIRE' || !retirePassword}
              className="text-xs h-8 font-semibold shadow-xs"
            >
              {isRetiring ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Retiring Account...
                </>
              ) : (
                'Permanently Delete & Retire'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
