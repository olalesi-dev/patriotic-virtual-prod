import { IconChevronRight } from '@tabler/icons-react';
import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Breadcrumb({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      aria-label="breadcrumb"
      className={cn('text-sm', className)}
      {...props}
    />
  );
}

export function BreadcrumbList({ className, ...props }: ComponentProps<'ol'>) {
  return (
    <ol
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

export function BreadcrumbLink({ className, ...props }: ComponentProps<'a'>) {
  return (
    <a
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  );
}

export function BreadcrumbPage({
  className,
  ...props
}: ComponentProps<'span'>) {
  return (
    <span
      aria-current="page"
      className={cn('font-medium text-foreground', className)}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <li
      aria-hidden="true"
      className={cn('inline-flex items-center', className)}
    >
      {children ?? <IconChevronRight size={14} />}
    </li>
  );
}
