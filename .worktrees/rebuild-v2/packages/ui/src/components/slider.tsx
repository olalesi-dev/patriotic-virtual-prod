'use client';

import { Slider as BaseSlider } from '@base-ui/react/slider';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';

export type SliderProps = ComponentProps<typeof BaseSlider.Root>;

export function Slider({ className, ...props }: SliderProps) {
  return (
    <BaseSlider.Root
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className,
      )}
      {...props}
    >
      <BaseSlider.Control className="relative flex h-5 w-full items-center">
        <BaseSlider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <BaseSlider.Indicator className="absolute h-full bg-primary" />
        </BaseSlider.Track>
        <BaseSlider.Thumb className="block size-5 rounded-full border-2 border-primary bg-background shadow transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50" />
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
