'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { registerSchema, type RegisterFormData } from '../schemas/register-schema';
import { authApi } from '../api/auth-api';
import { ApiClientError } from '@/lib/api-client';
import { ME_QUERY_KEY } from '@/features/user/hooks/use-me';

function getFriendlyRegisterError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.statusCode === 409) return 'An account with this email already exists.';
    if (err.statusCode === 429) return 'Too many attempts. Please wait before trying again.';
    if (err.statusCode === 400)
      return err.message || 'Invalid registration data. Please check your input.';
    return 'Service is temporarily unavailable. Please try again later.';
  }
  return err instanceof Error ? err.message : 'Registration failed';
}

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const clearError = () => {
    if (error) setError(null);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    try {
      const response = await authApi.register({ email: data.email, password: data.password });
      queryClient.clear();
      if (response?.user) {
        queryClient.setQueryData(ME_QUERY_KEY, response.user);
      }
      router.push('/threads');
      router.refresh();
    } catch (err) {
      setError(getFriendlyRegisterError(err));
    }
  };

  return (
    <div className="w-full max-w-sm">
      {}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width={48} height={48}>
            <defs>
              <linearGradient id="gradK" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#FF7F50', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#FF6347', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <rect x="20" y="20" width="80" height="80" rx="17" fill="url(#gradK)" />
            <path
              d="M 43 42 L 43 78 M 43 60 L 65 42 L 65 48 M 43 60 L 65 78 L 65 72"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M 68 54 L 75 60 L 68 66"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-white">Create an account</h1>
        <p className="mt-1 text-sm text-stone-400">Get started for free</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-300 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'reg-email-error' : undefined}
            {...register('email', { onChange: clearError })}
            className="
              w-full px-3.5 py-2.5 rounded-lg border text-sm text-stone-900
              bg-white placeholder:text-stone-400
              border-stone-300 focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]/30
              outline-none transition-colors disabled:opacity-50
            "
            placeholder="you@example.com"
            disabled={isSubmitting}
          />
          {errors.email && (
            <p id="reg-email-error" className="mt-1.5 text-xs text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        {}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'reg-password-error' : undefined}
              {...register('password', { onChange: clearError })}
              className="
                w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm text-stone-900
                bg-white placeholder:text-stone-400
                border-stone-300 focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]/30
                outline-none transition-colors disabled:opacity-50
              "
              placeholder="••••••••"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p id="reg-password-error" className="mt-1.5 text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        {}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-stone-300 mb-1.5"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'reg-confirm-error' : undefined}
              {...register('confirmPassword', { onChange: clearError })}
              className="
                w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm text-stone-900
                bg-white placeholder:text-stone-400
                border-stone-300 focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]/30
                outline-none transition-colors disabled:opacity-50
              "
              placeholder="••••••••"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600 transition-colors"
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="reg-confirm-error" className="mt-1.5 text-xs text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full py-2.5 px-4 rounded-lg text-sm font-medium
            bg-[#1C1917] text-white
            hover:bg-[#312E2B] active:bg-[#0A0A09]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[#CC785C] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
