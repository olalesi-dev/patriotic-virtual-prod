import { IconLoader2 } from '@tabler/icons-react';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export type SpinnerProps = ComponentProps<typeof IconLoader2>;

export function Spinner({ className, size = 16, ...props }: SpinnerProps) {
  return (
    <IconLoader2
      aria-hidden="true"
      className={cn('animate-spin text-current', className)}
      size={size}
      {...props}
    />
  );
}
