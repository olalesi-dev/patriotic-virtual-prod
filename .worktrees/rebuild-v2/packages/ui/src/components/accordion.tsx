'use client';

import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { IconChevronDown } from '@tabler/icons-react';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const AccordionRoot = BaseAccordion.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof BaseAccordion.Item>) {
  return (
    <BaseAccordion.Item className={cn('border-b', className)} {...props} />
  );
}

export function AccordionTrigger({
  children,
  className,
  ...props
}: ComponentProps<typeof BaseAccordion.Trigger>) {
  return (
    <BaseAccordion.Header>
      <BaseAccordion.Trigger
        className={cn(
          'flex w-full items-center justify-between py-4 text-left text-sm font-medium transition-colors hover:text-primary [&[data-panel-open]>svg]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <IconChevronDown className="size-4 shrink-0 transition-transform" />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

export function AccordionPanel({
  className,
  ...props
}: ComponentProps<typeof BaseAccordion.Panel>) {
  return (
    <BaseAccordion.Panel
      className={cn('pb-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
