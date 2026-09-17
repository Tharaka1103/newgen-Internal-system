import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AttributionBadgeProps {
  agentName?: string | null;
  isExactMonth?: boolean;
  matchedMonth?: string;
  noMatch?: boolean;
  className?: string;
}

/**
 * Shows the attributed agent inline on payment/registration forms.
 * Uses semantic badge variants from shadcn — no custom colors.
 */
export function AttributionBadge({
  agentName,
  isExactMonth,
  matchedMonth,
  noMatch,
  className,
}: AttributionBadgeProps) {
  if (noMatch || !agentName) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        No attribution — no matching call record
      </Badge>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <Badge variant="default" className="gap-1">
        Attributed: {agentName}
      </Badge>
      <Badge variant="outline" className="text-muted-foreground text-xs">
        {isExactMonth ? 'Exact month match' : `Fallback from ${matchedMonth}`}
      </Badge>
    </div>
  );
}
