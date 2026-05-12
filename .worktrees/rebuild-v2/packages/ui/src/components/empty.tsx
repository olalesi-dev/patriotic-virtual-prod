import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface EmptyProps extends Omit<ComponentProps<'div'>, 'title'> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function Empty({
  action,
  className,
  description,
  icon,
  title,
  ...props
}: EmptyProps) {
  return (
    <div
      className={cn(
        'flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-card p-8 text-center text-card-foreground',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-3 text-muted-foreground">{icon}</div>
      ) : undefined}
      <h3 className="text-sm font-medium">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : undefined}
      {action ? <div className="mt-4">{action}</div> : undefined}
    </div>
  );
}
