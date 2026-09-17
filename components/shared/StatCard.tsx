import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  className?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function StatCard({ title, value, description, className, icon, badge }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden bg-card hover:border-primary/30 transition-colors', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          {icon && (
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-2">
          <p className="text-xl sm:text-2xl font-bold font-heading truncate text-foreground">{value}</p>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
