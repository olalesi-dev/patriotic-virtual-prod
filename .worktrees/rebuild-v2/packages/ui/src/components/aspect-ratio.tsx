import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export interface AspectRatioProps extends ComponentProps<'div'> {
  ratio?: number;
}

export function AspectRatio({
  className,
  ratio = 16 / 9,
  style,
  ...props
}: AspectRatioProps) {
  return (
    <div
      className={cn('relative w-full overflow-hidden', className)}
      style={{ aspectRatio: ratio, ...style }}
      {...props}
    />
  );
}
