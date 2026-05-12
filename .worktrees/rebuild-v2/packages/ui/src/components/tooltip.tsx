'use client';

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export const TooltipProvider = BaseTooltip.Provider;

export function TooltipRoot(props: ComponentProps<typeof BaseTooltip.Root>) {
  return <BaseTooltip.Root {...props} />;
}

export function TooltipTrigger(
  props: ComponentProps<typeof BaseTooltip.Trigger>,
) {
  return <BaseTooltip.Trigger {...props} />;
}

export function TooltipContent({
  className,
  ...props
}: ComponentProps<typeof BaseTooltip.Popup>) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner sideOffset={8}>
        <BaseTooltip.Popup
          className={cn(
            'z-50 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md',
            className,
          )}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export function IconTooltip({
  children,
  label,
}: {
  children: ReactElement;
  label: ReactNode;
}) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </BaseTooltip.Root>
  );
}
