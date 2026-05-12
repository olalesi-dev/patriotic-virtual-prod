import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function Sidebar({ className, ...props }: ComponentProps<'aside'>) {
  return (
    <aside
      className={cn(
        'flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('border-b border-sidebar-border p-4', className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('min-h-0 flex-1 overflow-auto p-2', className)}
      {...props}
    />
  );
}

export function SidebarNavItem({ className, ...props }: ComponentProps<'a'>) {
  return (
    <a
      className={cn(
        'flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground',
        className,
      )}
      {...props}
    />
  );
}
