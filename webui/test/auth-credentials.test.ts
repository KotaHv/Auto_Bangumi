import { describe, expect, test } from 'bun:test';
import { validateCredentials } from '@/features/auth/credentials';

describe('validateCredentials', () => {
  test('reports a missing username before other credential errors', () => {
    expect(validateCredentials({ username: '', password: '' })).toBe(
      'username-required',
    );
  });

  test('reports a missing password after a valid username', () => {
    expect(validateCredentials({ username: 'admin', password: '' })).toBe(
      'password-required',
    );
  });

  test('reports a password shorter than eight characters', () => {
    expect(validateCredentials({ username: 'admin', password: 'short' })).toBe(
      'password-too-short',
    );
  });

  test('accepts valid credentials', () => {
    expect(
      validateCredentials({ username: 'admin', password: 'password' }),
    ).toBeNull();
  });
});
