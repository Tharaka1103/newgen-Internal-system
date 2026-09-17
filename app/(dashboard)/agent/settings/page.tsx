import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AgentSettingsPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader title="Settings" description="Your personal preferences" />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notifications</CardTitle>
          <CardDescription className="text-xs">
            Notification preferences will be configurable here as additional features are added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You currently receive in-app notifications for registration and payment attributions, and claim request updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
