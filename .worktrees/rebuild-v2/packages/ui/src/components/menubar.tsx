import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function Menubar({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      className={cn(
        'flex h-10 items-center gap-1 rounded-md border bg-background p-1 shadow-sm',
        className,
      )}
      role="menubar"
      {...props}
    />
  );
}

export function MenubarItem({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      className={cn(
        'inline-flex h-8 items-center rounded px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      role="menuitem"
      type="button"
      {...props}
    />
  );
}
