import { Separator as BaseSeparator } from '@base-ui/react/separator';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export interface SeparatorProps extends ComponentProps<typeof BaseSeparator> {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: SeparatorProps) {
  return (
    <BaseSeparator
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      orientation={orientation}
      {...props}
    />
  );
}
