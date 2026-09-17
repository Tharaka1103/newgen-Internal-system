import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface PageHeaderProps {
  title: string;
  description?: string;
  note?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, note, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold font-heading tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">• {description}</p>
          )}
          {note && (
            <p className="text-xs text-muted-foreground">{note}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 pt-1">{actions}</div>}
      </div>
    </div>
  );
}
