'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../src/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, isLoading, error: authError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await signup(formData.email, formData.password, formData.username);
      }
      router.push('/');
    } catch {
      // Error is handled by auth context
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            StoryForge
          </Link>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        <div className="card">
          {/* Tab Switcher */}
          <div className="flex mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                isLogin
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 border-b border-gray-200'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                !isLogin
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 border-b border-gray-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {(error || authError) && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error || authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="creativestoryteller"
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                required
              />
              {isLogin && (
                <div className="mt-1 text-right">
                  <Link href="/forgot-password" className="text-sm text-cyan hover:underline">
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {isLoading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
            </button>
          </form>

          {/* Demo Account */}
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-sm text-gray-500 mb-2">Try with demo account:</p>
            <button
              onClick={() => {
                setFormData({
                  email: 'alice@storyforge.dev',
                  password: 'Demo123!',
                  username: '',
                });
                setIsLogin(true);
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              alice@storyforge.dev / Demo123!
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/" className="hover:underline">
            ← Back to Home
          </Link>
        </p>
      </div>
    </main>
  );
}
