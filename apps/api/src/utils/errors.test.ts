import { describe, expect, test } from 'bun:test';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from './errors';

describe('Custom Errors', () => {
  test('BadRequestException has correct status and message', () => {
    const error = new BadRequestException('Bad request message');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad request message');
  });

  test('NotFoundException has correct status and message', () => {
    const error = new NotFoundException('Not found message');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Not found message');
  });

  test('InternalServerErrorException has correct status and message', () => {
    const error = new InternalServerErrorException(
      'Internal server error message',
    );
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Internal server error message');
  });
});
