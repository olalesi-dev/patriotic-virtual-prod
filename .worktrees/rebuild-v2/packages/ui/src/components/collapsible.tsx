'use client';

import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const CollapsibleRoot = BaseCollapsible.Root;
export const CollapsibleTrigger = BaseCollapsible.Trigger;

export function CollapsiblePanel({
  className,
  ...props
}: ComponentProps<typeof BaseCollapsible.Panel>) {
  return (
    <BaseCollapsible.Panel
      className={cn('overflow-hidden data-[starting-style]:h-0', className)}
      {...props}
    />
  );
}
