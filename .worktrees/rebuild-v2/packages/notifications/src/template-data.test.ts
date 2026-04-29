import { describe, expect, it } from 'bun:test';
import {
  formatAppointmentDate,
  formatAppointmentTime,
  formatRequestedDate,
  getPlatformName,
} from './template-data';

describe('notification template data helpers', () => {
  it('exposes the platform name', () => {
    expect(getPlatformName()).toBe('Patriotic Telehealth');
  });

  it('formats appointment dates and times', () => {
    const value = '2026-04-28T15:30:00.000Z';

    expect(formatAppointmentDate(value)).toContain('2026');
    expect(formatAppointmentTime(value)).toMatch(/\d/);
  });

  it('uses safe fallback copy for missing dates', () => {
    expect(formatAppointmentDate(undefined)).toBe('TBD');
    expect(formatAppointmentTime(undefined)).toBe('TBD');
    expect(formatRequestedDate(undefined)).toBe('as soon as possible');
  });
});
