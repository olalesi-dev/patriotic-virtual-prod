import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export type BadgeVariant = 'primary' | 'secondary' | 'outline' | 'destructive';
export interface BadgeProps extends ComponentProps<'span'> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  primary: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'border-border text-foreground',
  destructive: 'border-transparent bg-destructive text-destructive-foreground',
};

export function Badge({
  className,
  variant = 'secondary',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
