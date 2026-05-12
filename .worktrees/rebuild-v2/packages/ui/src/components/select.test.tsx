import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { defineSelectOptions, type SelectOption } from '../lib/options';
import { Select } from './select';

afterEach(cleanup);

describe('Select', () => {
  it('supports object values only when an explicit key getter is supplied', () => {
    interface Provider {
      id: string;
      name: string;
    }
    const providerOptions: SelectOption<Provider>[] = [
      { label: 'Dr. Avery Stone', value: { id: 'provider_1', name: 'Avery' } },
      { label: 'Dr. Mina Rao', value: { id: 'provider_2', name: 'Mina' } },
    ];
    const providers = defineSelectOptions(providerOptions);
    let selectedProvider: Provider | undefined;

    const { container } = render(
      <Select
        getOptionKey={(provider) => provider.id}
        name="providerId"
        options={providers}
        placeholder="Assign provider"
        onValueChange={(value) => {
          selectedProvider = value;
        }}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Dr. Mina Rao' }));

    expect(selectedProvider).toEqual({ id: 'provider_2', name: 'Mina' });
    expect(
      container
        .querySelector('input[name="providerId"]')
        ?.getAttribute('value'),
    ).toBe('provider_2');
  });

  it('handles primitive values without a custom key getter', () => {
    const statuses = defineSelectOptions([
      { label: 'Pending', value: 'pending' },
      { label: 'Confirmed', value: 'confirmed' },
    ]);
    let selectedStatus: string | undefined;

    render(
      <Select
        options={statuses}
        value="pending"
        onValueChange={(value) => {
          selectedStatus = value;
        }}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Confirmed' }));

    expect(selectedStatus).toBe('confirmed');
  });
});
