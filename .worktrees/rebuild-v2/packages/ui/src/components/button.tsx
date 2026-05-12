import { Button as BaseButton } from '@base-ui/react/button';
import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './spinner';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ComponentProps<typeof BaseButton> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  secondary:
    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  outline:
    'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive:
    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  link: 'text-primary underline-offset-4 hover:underline',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
  icon: 'size-9 p-0',
};

export function Button({
  className,
  children,
  disabled,
  isLoading = false,
  leftContent,
  rightContent,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  let trailingContent: ReactNode;
  if (isLoading) {
    trailingContent = <Spinner className="ml-0.5" />;
  } else if (rightContent) {
    trailingContent = <span className="inline-flex">{rightContent}</span>;
  }

  return (
    <BaseButton
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {leftContent ? (
        <span className="inline-flex">{leftContent}</span>
      ) : undefined}
      {children}
      {trailingContent}
    </BaseButton>
  );
}
