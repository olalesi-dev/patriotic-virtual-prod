/** @bun-test-environment jsdom */
import * as React from 'react';
import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders correctly', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).not.toBeNull();
  });

  test('applies custom className', () => {
    render(<Button className="custom-class">Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button.className).toContain('custom-class');
  });
});
