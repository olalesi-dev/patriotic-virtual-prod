import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export function ChartContainer({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex aspect-video w-full items-center justify-center rounded-lg border bg-card text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function ChartLegend({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-3 text-xs', className)}
      {...props}
    />
  );
}

export interface ChartLegendItemProps extends ComponentProps<'span'> {
  token?: 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5';
}

const swatches = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
};

export function ChartLegendItem({
  children,
  className,
  token = 'chart-1',
  ...props
}: ChartLegendItemProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    >
      <span className={cn('size-2 rounded-full', swatches[token])} />
      {children}
    </span>
  );
}
