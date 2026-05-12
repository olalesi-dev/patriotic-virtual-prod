'use client';

import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { type ComponentProps, useState } from 'react';
import { Button } from './button';
import { Input } from './input';

export type PasswordInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'rightContent'
>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      type={visible ? 'text' : 'password'}
      rightContent={
        <Button
          aria-label={visible ? 'Hide password' : 'Show password'}
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        </Button>
      }
      {...props}
    />
  );
}
