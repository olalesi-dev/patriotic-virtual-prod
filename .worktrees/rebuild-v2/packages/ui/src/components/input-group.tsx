import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function InputGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex w-full items-center [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*+*]:-ml-px',
        className,
      )}
      {...props}
    />
  );
}
