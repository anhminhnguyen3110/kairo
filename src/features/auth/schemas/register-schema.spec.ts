import { describe, it, expect } from 'vitest';
import { registerSchema } from './register-schema';

describe('registerSchema', () => {
  const valid = {
    email: 'user@example.com',
    password: 'Secret123',
    confirmPassword: 'Secret123',
  };

  it('accepts valid registration data', () => {
    expect(() => registerSchema.parse(valid)).not.toThrow();
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({ ...valid, email: 'bad-email' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Invalid email address');
  });

  it('rejects empty email', () => {
    expect(registerSchema.safeParse({ ...valid, email: '' }).success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Password must be at least 8 characters');
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: 'DifferentPassword',
    });
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path.includes('confirmPassword'));
    expect(issue?.message).toBe('Passwords do not match');
  });

  it('rejects missing confirmPassword', () => {
    const { confirmPassword: _, ...noConfirm } = valid;
    expect(registerSchema.safeParse(noConfirm).success).toBe(false);
  });

  it('rejects all-empty input', () => {
    expect(registerSchema.safeParse({}).success).toBe(false);
  });

  it('returns the parsed data when valid', () => {
    const parsed = registerSchema.parse(valid);
    expect(parsed.email).toBe('user@example.com');
    expect(parsed.password).toBe('Secret123');
    expect(parsed.confirmPassword).toBe('Secret123');
  });
});
