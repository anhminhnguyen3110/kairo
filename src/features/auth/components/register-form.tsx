'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { registerSchema, type RegisterFormData } from '../schemas/register-schema';
import { authApi } from '../api/auth-api';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    try {
      await authApi.register({ email: data.email, password: data.password });
      router.push('/threads');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="w-full max-w-sm">
      {}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kairo.svg" alt="Kairo" width={48} height={48} />
        </div>
        <h1 className="text-2xl font-semibold text-white">Create an account</h1>
        <p className="mt-1 text-sm text-stone-400">Get started for free</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
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
            {...register('email')}
            className="
              w-full px-3.5 py-2.5 rounded-lg border text-sm text-stone-900
              bg-white placeholder:text-stone-400
              border-stone-300 focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]/30
              outline-none transition-colors disabled:opacity-50
            "
            placeholder="you@example.com"
            disabled={isSubmitting}
          />
          {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        {}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-300 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            className="
              w-full px-3.5 py-2.5 rounded-lg border text-sm text-stone-900
              bg-white placeholder:text-stone-400
              border-stone-300 focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]/30
              outline-none transition-colors disabled:opacity-50
            "
            placeholder="••••••••"
            disabled={isSubmitting}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
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
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="
              w-full px-3.5 py-2.5 rounded-lg border text-sm text-stone-900
              bg-white placeholder:text-stone-400
              border-stone-300 focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C]/30
              outline-none transition-colors disabled:opacity-50
            "
            placeholder="••••••••"
            disabled={isSubmitting}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword.message}</p>
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
