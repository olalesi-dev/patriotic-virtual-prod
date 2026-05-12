'use client';

import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const AlertDialogRoot = BaseAlertDialog.Root;
export const AlertDialogTrigger = BaseAlertDialog.Trigger;
export const AlertDialogCancel = BaseAlertDialog.Close;
export const AlertDialogAction = BaseAlertDialog.Close;

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Popup>) {
  return (
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
      <BaseAlertDialog.Popup
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-popover p-6 text-popover-foreground shadow-lg',
          className,
        )}
        {...props}
      />
    </BaseAlertDialog.Portal>
  );
}

export const AlertDialogTitle = BaseAlertDialog.Title;
export const AlertDialogDescription = BaseAlertDialog.Description;
