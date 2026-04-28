import { expect, test, describe } from 'bun:test';
import { runMigrate } from './migrate.js';

describe('Migrate Script', () => {
  test('should export runMigrate function', () => {
    expect(typeof runMigrate).toBe('function');
  });
});
