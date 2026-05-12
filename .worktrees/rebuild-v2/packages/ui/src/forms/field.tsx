import { Field as BaseField } from '@base-ui/react/field';
import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Label } from '../components/label';

export interface FieldMetaLike {
  errors?: unknown[];
  isTouched?: boolean;
}

export interface FieldApiLike<TValue> {
  name: string;
  state: {
    value: TValue;
    meta?: FieldMetaLike;
  };
  handleBlur?: () => void;
  handleChange: (value: TValue) => void;
}

export interface FieldProps extends ComponentProps<'div'> {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
}

export function Field({
  children,
  className,
  description,
  error,
  htmlFor,
  label,
  ...props
}: FieldProps) {
  return (
    <BaseField.Root className={cn('grid gap-2', className)} {...props}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : undefined}
      {children}
      {description ? (
        <FormDescription>{description}</FormDescription>
      ) : undefined}
      {error ? <FormErrorMessage>{error}</FormErrorMessage> : undefined}
    </BaseField.Root>
  );
}

export function FormDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}

export function FormErrorMessage({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    />
  );
}

export function getFieldError<TValue>(field: FieldApiLike<TValue>) {
  const error = field.state.meta?.errors?.[0];
  if (!error) {
    return undefined;
  }
  return error instanceof Error ? error.message : String(error);
}
