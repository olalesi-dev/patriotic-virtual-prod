import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type FieldApiLike } from './field';
import { FormPasswordInput } from './form-password-input';

afterEach(cleanup);

describe('FormPasswordInput', () => {
  it('binds TanStack Form-style fields and renders validation context', () => {
    let changedValue = '';
    let blurred = false;
    const field: FieldApiLike<string> = {
      handleBlur: () => {
        blurred = true;
      },
      handleChange: (value) => {
        changedValue = value;
      },
      name: 'password',
      state: {
        meta: { errors: [new Error('Password is too short')] },
        value: 'initial-secret',
      },
    };

    render(
      <FormPasswordInput
        description="Use at least 12 characters."
        field={field}
        label="Password"
      />,
    );

    const input = screen.getByLabelText('Password') as HTMLInputElement;

    expect(input.name).toBe('password');
    expect(input.type).toBe('password');
    expect(screen.getByText('Use at least 12 characters.')).toBeDefined();
    expect(screen.getByText('Password is too short')).toBeDefined();

    fireEvent.change(input, { target: { value: 'next-secret' } });
    fireEvent.blur(input);

    expect(changedValue).toBe('next-secret');
    expect(blurred).toBe(true);
  });

  it('supports in-place password visibility toggling', () => {
    const field: FieldApiLike<string> = {
      handleChange: () => undefined,
      name: 'password',
      state: { value: 'initial-secret' },
    };

    render(<FormPasswordInput field={field} label="Password" />);

    const input = screen.getByLabelText('Password') as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input.type).toBe('password');
  });
});
