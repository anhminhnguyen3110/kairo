import { describe, it, expect } from 'vitest';
import { loginSchema } from './login-schema';

describe('loginSchema', () => {
  const valid = { email: 'user@example.com', password: 'anypassword' };

  it('accepts a valid email and password', () => {
    expect(() => loginSchema.parse(valid)).not.toThrow();
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Invalid email address');
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ ...valid, email: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ ...valid, password: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Password must be at least 8 characters');
  });

  it('rejects password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({ ...valid, password: 'short' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Password must be at least 8 characters');
  });

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
  });

  it('infers correct type shape', () => {
    const parsed = loginSchema.parse(valid);
    expect(parsed).toEqual({ email: 'user@example.com', password: 'anypassword' });
  });
});
