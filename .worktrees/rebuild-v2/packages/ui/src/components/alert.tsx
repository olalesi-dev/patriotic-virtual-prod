import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export type AlertVariant = 'default' | 'destructive';

export interface AlertProps extends ComponentProps<'div'> {
  variant?: AlertVariant;
}

export function Alert({
  className,
  variant = 'default',
  ...props
}: AlertProps) {
  return (
    <div
      className={cn(
        'relative w-full rounded-lg border p-4 text-sm',
        variant === 'destructive'
          ? 'border-destructive/50 text-destructive'
          : 'bg-card text-card-foreground',
        className,
      )}
      role="alert"
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: ComponentProps<'h5'>) {
  return (
    <h5 className={cn('mb-1 font-medium leading-none', className)} {...props} />
  );
}

export function AlertDescription({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div className={cn('text-sm leading-relaxed', className)} {...props} />
  );
}
