import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { Button } from './button';

afterEach(cleanup);

describe('Button', () => {
  it('disables interaction and renders a spinner while loading', () => {
    render(<Button isLoading>Save changes</Button>);

    const button = screen.getByRole('button', { name: 'Save changes' });

    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.querySelector('.animate-spin')).not.toBeNull();
  });

  it('renders leading and trailing content without changing the button name', () => {
    render(
      <Button
        leftContent={<span aria-hidden="true">L</span>}
        rightContent={<span aria-hidden="true">R</span>}
        variant="outline"
      >
        Invite staff
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Invite staff' });

    expect(button.textContent).toContain('Invite staff');
    expect(button.className).toContain('border-input');
  });
});
