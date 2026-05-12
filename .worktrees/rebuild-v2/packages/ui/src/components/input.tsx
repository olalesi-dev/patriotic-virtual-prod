import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends ComponentProps<'input'> {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
}

export function Input({
  className,
  leftContent,
  rightContent,
  ref,
  ...props
}: InputProps) {
  if (!leftContent && !rightContent) {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
        className,
      )}
    >
      {leftContent ? (
        <span className="inline-flex shrink-0 text-muted-foreground">
          {leftContent}
        </span>
      ) : undefined}
      <input
        ref={ref}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        {...props}
      />
      {rightContent ? (
        <span className="inline-flex shrink-0 text-muted-foreground">
          {rightContent}
        </span>
      ) : undefined}
    </div>
  );
}
