'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
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

  useEffect(() => { load(); }, []);

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
    <Button onClick={onClick} disabled={isSaving} size="sm" id="save-settings-btn">
      {saved ? (
        <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Saved</>
      ) : isSaving ? (
        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving</>
      ) : 'Save Changes'}
    </Button>
  );
}

export default function SettingsPage() {
  const { settings, update, save, isLoading, isSaving, saved, error } = useSettings();
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);

  const testSmtp = async () => {
    setSmtpTestResult('Sending...');
    try {
      const res = await fetch('/api/settings/smtp-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: settings[SettingKey.SMTP_USER] }) });
      const data = await res.json();
      setSmtpTestResult(data.success ? '✓ Test email sent successfully!' : `Error: ${data.error}`);
    } catch {
      setSmtpTestResult('Failed to send test email');
    }
    setTimeout(() => setSmtpTestResult(null), 5000);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" description="System configuration and admin-controlled values" />

      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" id="settings-general-tab">General</TabsTrigger>
          <TabsTrigger value="commission" id="settings-commission-tab">Commission</TabsTrigger>
          <TabsTrigger value="security" id="settings-security-tab">Security</TabsTrigger>
          <TabsTrigger value="smtp" id="settings-smtp-tab">SMTP</TabsTrigger>
        </TabsList>

        {/* ── General ──────────────────────────────────────────────── */}
        <TabsContent value="general" className="mt-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Branding</CardTitle>
              <CardDescription className="text-xs">Your organization name and logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="setting-company-name">Company Name</Label>
                <Input id="setting-company-name" value={settings[SettingKey.COMPANY_NAME]} onChange={(e) => update(SettingKey.COMPANY_NAME, e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-logo-url">Logo URL</Label>
                <Input id="setting-logo-url" value={settings[SettingKey.COMPANY_LOGO_URL]} onChange={(e) => update(SettingKey.COMPANY_LOGO_URL, e.target.value)} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <SaveButton onClick={() => save([SettingKey.COMPANY_NAME, SettingKey.COMPANY_LOGO_URL])} isSaving={isSaving} saved={saved} />
          </div>
        </TabsContent>

        {/* ── Commission ────────────────────────────────────────────── */}
        <TabsContent value="commission" className="mt-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Reward Configuration</CardTitle>
              <CardDescription className="text-xs">How agents earn loyalty points and credit points</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="setting-loyalty-per-reg">Loyalty Points Per New Registration (Rs.)</Label>
                <Input id="setting-loyalty-per-reg" type="number" value={settings[SettingKey.LOYALTY_AMOUNT_PER_REGISTRATION]} onChange={(e) => update(SettingKey.LOYALTY_AMOUNT_PER_REGISTRATION, e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-min-claim">Minimum Claim Amount (Rs.)</Label>
                <Input id="setting-min-claim" type="number" value={settings[SettingKey.MIN_CLAIM_AMOUNT]} onChange={(e) => update(SettingKey.MIN_CLAIM_AMOUNT, e.target.value)} />
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="setting-credit-reg">CreditPoints Per Registration Match</Label>
                <Input id="setting-credit-reg" type="number" value={settings[SettingKey.CREDIT_POINTS_REGISTRATION]} onChange={(e) => update(SettingKey.CREDIT_POINTS_REGISTRATION, e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-credit-pay">CreditPoints Per Payment Match</Label>
                <Input id="setting-credit-pay" type="number" value={settings[SettingKey.CREDIT_POINTS_PAYMENT]} onChange={(e) => update(SettingKey.CREDIT_POINTS_PAYMENT, e.target.value)} />
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="setting-grace-days">Previous Month Grace Period (Days)</Label>
                <Input id="setting-grace-days" type="number" value={settings[SettingKey.PREV_MONTH_GRACE_DAYS]} onChange={(e) => update(SettingKey.PREV_MONTH_GRACE_DAYS, e.target.value)} />
                <p className="text-xs text-muted-foreground">How many days into the new month agents can still log calls for the previous month.</p>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <SaveButton onClick={() => save([SettingKey.LOYALTY_AMOUNT_PER_REGISTRATION, SettingKey.MIN_CLAIM_AMOUNT, SettingKey.CREDIT_POINTS_REGISTRATION, SettingKey.CREDIT_POINTS_PAYMENT, SettingKey.PREV_MONTH_GRACE_DAYS])} isSaving={isSaving} saved={saved} />
          </div>
        </TabsContent>

        {/* ── Security ──────────────────────────────────────────────── */}
        <TabsContent value="security" className="mt-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Session &amp; Login</CardTitle>
              <CardDescription className="text-xs">Controls for login attempts and session duration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="setting-session-timeout">Session Timeout (Minutes)</Label>
                <Input id="setting-session-timeout" type="number" value={settings[SettingKey.SESSION_TIMEOUT_MINUTES]} onChange={(e) => update(SettingKey.SESSION_TIMEOUT_MINUTES, e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-max-attempts">Max Login Attempts Before Lockout</Label>
                <Input id="setting-max-attempts" type="number" value={settings[SettingKey.MAX_LOGIN_ATTEMPTS]} onChange={(e) => update(SettingKey.MAX_LOGIN_ATTEMPTS, e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-lockout-duration">Lockout Duration (Minutes)</Label>
                <Input id="setting-lockout-duration" type="number" value={settings[SettingKey.LOCKOUT_DURATION_MINUTES]} onChange={(e) => update(SettingKey.LOCKOUT_DURATION_MINUTES, e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Password Policy</CardTitle>
              <CardDescription className="text-xs">Minimum requirements for user passwords</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="setting-pwd-min-length">Minimum Password Length</Label>
                <Input id="setting-pwd-min-length" type="number" value={settings[SettingKey.PASSWORD_MIN_LENGTH]} onChange={(e) => update(SettingKey.PASSWORD_MIN_LENGTH, e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="setting-pwd-uppercase">Require Uppercase Letter</Label>
                <Switch id="setting-pwd-uppercase" checked={settings[SettingKey.PASSWORD_REQUIRE_UPPERCASE] === 'true'} onCheckedChange={(v) => update(SettingKey.PASSWORD_REQUIRE_UPPERCASE, String(v))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="setting-pwd-number">Require Number</Label>
                <Switch id="setting-pwd-number" checked={settings[SettingKey.PASSWORD_REQUIRE_NUMBER] === 'true'} onCheckedChange={(v) => update(SettingKey.PASSWORD_REQUIRE_NUMBER, String(v))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="setting-pwd-symbol">Require Special Character</Label>
                <Switch id="setting-pwd-symbol" checked={settings[SettingKey.PASSWORD_REQUIRE_SYMBOL] === 'true'} onCheckedChange={(v) => update(SettingKey.PASSWORD_REQUIRE_SYMBOL, String(v))} />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <SaveButton onClick={() => save([SettingKey.SESSION_TIMEOUT_MINUTES, SettingKey.MAX_LOGIN_ATTEMPTS, SettingKey.LOCKOUT_DURATION_MINUTES, SettingKey.PASSWORD_MIN_LENGTH, SettingKey.PASSWORD_REQUIRE_UPPERCASE, SettingKey.PASSWORD_REQUIRE_NUMBER, SettingKey.PASSWORD_REQUIRE_SYMBOL])} isSaving={isSaving} saved={saved} />
          </div>
        </TabsContent>

        {/* ── SMTP ──────────────────────────────────────────────────── */}
        <TabsContent value="smtp" className="mt-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">SMTP Configuration</CardTitle>
              <CardDescription className="text-xs">Email server settings for password reset emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="setting-smtp-host">SMTP Host</Label>
                <Input id="setting-smtp-host" value={settings[SettingKey.SMTP_HOST]} onChange={(e) => update(SettingKey.SMTP_HOST, e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setting-smtp-port">Port</Label>
                  <Input id="setting-smtp-port" type="number" value={settings[SettingKey.SMTP_PORT]} onChange={(e) => update(SettingKey.SMTP_PORT, e.target.value)} />
                </div>
                <div className="flex items-center justify-between pt-6">
                  <Label htmlFor="setting-smtp-secure">SSL/TLS</Label>
                  <Switch id="setting-smtp-secure" checked={settings[SettingKey.SMTP_SECURE] === 'true'} onCheckedChange={(v) => update(SettingKey.SMTP_SECURE, String(v))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-smtp-user">SMTP Username</Label>
                <Input id="setting-smtp-user" value={settings[SettingKey.SMTP_USER]} onChange={(e) => update(SettingKey.SMTP_USER, e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-smtp-pass">SMTP Password</Label>
                <Input id="setting-smtp-pass" type="password" value={settings[SettingKey.SMTP_PASS]} onChange={(e) => update(SettingKey.SMTP_PASS, e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setting-smtp-from">From Address</Label>
                <Input id="setting-smtp-from" value={settings[SettingKey.SMTP_FROM]} onChange={(e) => update(SettingKey.SMTP_FROM, e.target.value)} placeholder="No Reply <noreply@school.com>" />
              </div>
              {smtpTestResult && (
                <Alert>
                  <AlertDescription className="text-sm">{smtpTestResult}</AlertDescription>
                </Alert>
              )}
              <Button variant="outline" size="sm" onClick={testSmtp} id="test-smtp-btn">
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Send Test Email
              </Button>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <SaveButton onClick={() => save([SettingKey.SMTP_HOST, SettingKey.SMTP_PORT, SettingKey.SMTP_SECURE, SettingKey.SMTP_USER, SettingKey.SMTP_PASS, SettingKey.SMTP_FROM])} isSaving={isSaving} saved={saved} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
