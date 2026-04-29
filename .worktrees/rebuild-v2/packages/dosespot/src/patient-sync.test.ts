import { describe, expect, it } from 'bun:test';
import { normalizeGender, normalizePhone, normalizeZip } from './patient-sync';

describe('DoseSpot Normalization Helpers', () => {
  it('normalizeGender should handle various inputs', () => {
    expect(normalizeGender('male')).toBe('Male');
    expect(normalizeGender('M')).toBe('Male');
    expect(normalizeGender('female')).toBe('Female');
    expect(normalizeGender('f')).toBe('Female');
    expect(normalizeGender('unknown')).toBe('Unknown');
    expect(normalizeGender('')).toBe('Unknown');
    expect(normalizeGender(undefined)).toBe('Unknown');
  });

  it('normalizePhone should return last 10 digits', () => {
    expect(normalizePhone('1234567890')).toBe('1234567890');
    expect(normalizePhone('+1 (123) 456-7890')).toBe('1234567890');
    expect(normalizePhone('456-7890')).toBe('4567890');
    expect(normalizePhone('')).toBe('');
  });

  it('normalizeZip should return first 5 digits', () => {
    expect(normalizeZip('12345')).toBe('12345');
    expect(normalizeZip('12345-6789')).toBe('12345');
    expect(normalizeZip('90210')).toBe('90210');
    expect(normalizeZip('')).toBe('');
  });
});
