'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bell,
  Headphones,
} from 'lucide-react';

export default function AgentSettingsPage() {
  const { data: session, update: updateSession } = useSession();

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

  // Load profile from API or session
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

      setProfileSuccess('Profile information updated successfully.');
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
      setPasswordError('New passwords do not match. Please verify and re-type.');
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
        setPasswordError(json.error || 'Failed to change password.');
        return;
      }

      setPasswordSuccess('Password changed successfully.');
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

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Settings & Profile"
        description="Manage your agent personal details, contact email, and security password"
      />

      {/* 1. Profile Details Card */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Agent Profile
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Your public name and registered email for system notifications
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[11px] font-mono capitalize gap-1">
              <Headphones className="h-3 w-3" />
              Agent
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="agent-name" className="text-xs font-semibold">
                  Full Name *
                </Label>
                <Input
                  id="agent-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Kasun Bandara"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-email" className="text-xs font-semibold">
                  Email Address *
                </Label>
                <Input
                  id="agent-email"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="agent@newgen.com"
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
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Profile Details'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. Change Password Card */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Update your account password to maintain security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="space-y-1.5 max-w-sm">
              <Label htmlFor="agent-current-pwd" className="text-xs font-semibold">
                Current Password *
              </Label>
              <Input
                id="agent-current-pwd"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="agent-new-pwd" className="text-xs font-semibold">
                  New Password *
                </Label>
                <Input
                  id="agent-new-pwd"
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
                <Label htmlFor="agent-confirm-pwd" className="text-xs font-semibold">
                  Confirm New Password *
                </Label>
                <Input
                  id="agent-confirm-pwd"
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
              <div className="p-2.5 rounded-md bg-emerald-500/10 text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSavingPassword}
                size="sm"
                className="h-8 text-xs shadow-xs"
              >
                {isSavingPassword ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Notifications & Activity Preferences Card */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            In-App Notifications
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Automatic activity alerts triggered by student events
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <div className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
            <p className="font-semibold text-foreground">Active Alert Triggers:</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>New Student Registration: You are notified immediately when a student you called registers into the school.</li>
              <li>Tuition Payment Attributions: Commission points are awarded each time an enrolled student completes payment.</li>
              <li>Loyalty Cash Claims: Status updates when an administrator approves or processes your cash payout.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
