'use client';

import { Toaster, toast, type ToasterProps } from 'sonner';

export type ToastProviderProps = ToasterProps;

export function ToastProvider(props: ToastProviderProps) {
  return <Toaster duration={2000} richColors position="top-right" {...props} />;
}

export { toast };
