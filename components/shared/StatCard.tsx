import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, description, className }: StatCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6 pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold font-heading mt-2 truncate">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
