'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../src/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await api.forgotPassword(email);
      setSuccess(true);
      // In dev mode, show the reset URL
      if (result.resetUrl) {
        setResetUrl(result.resetUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">📧</div>
          <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
          <p className="text-gray-400 mb-6">
            If an account exists for {email}, we&apos;ve sent a password reset link.
          </p>
          
          {/* Dev mode: show reset URL */}
          {resetUrl && (
            <div className="bg-cyan/10 border border-cyan/50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-cyan mb-2">Development Mode - Reset Link:</p>
              <a href={resetUrl} className="text-sm text-cyan hover:underline break-all">
                {resetUrl}
              </a>
            </div>
          )}

          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-magenta via-cyan to-gold bg-clip-text text-transparent">
              Forgot Password
            </span>
          </h1>
          <p className="text-gray-400">Enter your email to receive a reset link</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-black/30 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
              isLoading || !email
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-magenta to-cyan text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan/20'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>

          <div className="text-center text-sm text-gray-400">
            Remember your password?{' '}
            <Link href="/login" className="text-cyan hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
