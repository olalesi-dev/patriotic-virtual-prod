'use client';

import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const SheetRoot = BaseDrawer.Root;
export const SheetTrigger = BaseDrawer.Trigger;
export const SheetClose = BaseDrawer.Close;

export function SheetContent({
  className,
  ...props
}: ComponentProps<typeof BaseDrawer.Popup>) {
  return (
    <BaseDrawer.Portal>
      <BaseDrawer.Backdrop className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
      <BaseDrawer.Popup
        className={cn(
          'fixed inset-y-0 right-0 z-50 h-full w-full max-w-md border-l bg-popover p-6 text-popover-foreground shadow-lg',
          className,
        )}
        {...props}
      />
    </BaseDrawer.Portal>
  );
}

export const SheetTitle = BaseDrawer.Title;
export const SheetDescription = BaseDrawer.Description;
