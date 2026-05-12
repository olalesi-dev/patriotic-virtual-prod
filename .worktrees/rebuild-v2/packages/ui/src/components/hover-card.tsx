'use client';

import { PreviewCard as BasePreviewCard } from '@base-ui/react/preview-card';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const HoverCardRoot = BasePreviewCard.Root;
export const HoverCardTrigger = BasePreviewCard.Trigger;

export function HoverCardContent({
  className,
  ...props
}: ComponentProps<typeof BasePreviewCard.Popup>) {
  return (
    <BasePreviewCard.Portal>
      <BasePreviewCard.Positioner sideOffset={8}>
        <BasePreviewCard.Popup
          className={cn(
            'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md',
            className,
          )}
          {...props}
        />
      </BasePreviewCard.Positioner>
    </BasePreviewCard.Portal>
  );
}
