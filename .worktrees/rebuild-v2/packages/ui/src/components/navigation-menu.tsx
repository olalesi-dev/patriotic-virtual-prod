import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function NavigationMenu({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav className={cn('flex items-center gap-2', className)} {...props} />
  );
}

export function NavigationMenuList({
  className,
  ...props
}: ComponentProps<'ul'>) {
  return <ul className={cn('flex items-center gap-1', className)} {...props} />;
}

export function NavigationMenuItem({
  className,
  ...props
}: ComponentProps<'li'>) {
  return <li className={cn('relative', className)} {...props} />;
}

export function NavigationMenuLink({
  className,
  ...props
}: ComponentProps<'a'>) {
  return (
    <a
      className={cn(
        'inline-flex h-9 items-center rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  );
}
