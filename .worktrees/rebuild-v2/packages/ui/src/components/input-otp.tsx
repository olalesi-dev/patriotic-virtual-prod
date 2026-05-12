'use client';

import { OTPFieldPreview as BaseOtpField } from '@base-ui/react/otp-field';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export type InputOtpProps = ComponentProps<typeof BaseOtpField.Root>;

export function InputOtp({ className, ...props }: InputOtpProps) {
  return (
    <BaseOtpField.Root
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      <BaseOtpField.Input className="h-10 w-full rounded-md border border-input bg-background px-3 text-center font-mono text-sm tracking-[0.5em] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" />
    </BaseOtpField.Root>
  );
}
