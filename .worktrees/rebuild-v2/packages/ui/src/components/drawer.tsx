'use client';

import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const DrawerRoot = BaseDrawer.Root;
export const DrawerTrigger = BaseDrawer.Trigger;
export const DrawerClose = BaseDrawer.Close;

export function DrawerContent({
  className,
  ...props
}: ComponentProps<typeof BaseDrawer.Popup>) {
  return (
    <BaseDrawer.Portal>
      <BaseDrawer.Backdrop className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
      <BaseDrawer.Popup
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 rounded-t-lg border bg-popover p-6 text-popover-foreground shadow-lg',
          className,
        )}
        {...props}
      />
    </BaseDrawer.Portal>
  );
}

export const DrawerTitle = BaseDrawer.Title;
export const DrawerDescription = BaseDrawer.Description;
