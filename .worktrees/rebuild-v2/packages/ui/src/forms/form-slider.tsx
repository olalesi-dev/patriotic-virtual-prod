import { type ReactNode } from 'react';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormSliderProps {
  field: FieldApiLike<number>;
  label?: ReactNode;
  description?: ReactNode;
  min?: number;
  max?: number;
  step?: number;
}

export function FormSlider({
  description,
  field,
  label,
  max = 100,
  min = 0,
  step = 1,
}: FormSliderProps) {
  return (
    <Field description={description} error={getFieldError(field)} label={label}>
      <input
        className="h-2 w-full accent-current"
        max={max}
        min={min}
        step={step}
        type="range"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) =>
          field.handleChange(event.currentTarget.valueAsNumber)
        }
      />
    </Field>
  );
}
