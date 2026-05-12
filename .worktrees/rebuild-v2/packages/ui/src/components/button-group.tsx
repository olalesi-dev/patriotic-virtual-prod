import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export type ButtonGroupProps = ComponentProps<'div'>;

export function ButtonGroup({ className, ...props }: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*+*]:-ml-px',
        className,
      )}
      role="group"
      {...props}
    />
  );
}
