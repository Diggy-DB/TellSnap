'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../src/lib/auth-context';

export default function FollowingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">👥</span>
          <div>
            <h1 className="text-3xl font-bold">Following</h1>
            <p className="text-gray-400">Creators you follow</p>
          </div>
        </div>

        {/* Empty state - following feature not yet implemented */}
        <div className="text-center py-16">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-xl font-semibold mb-2">Not following anyone yet</h3>
          <p className="text-gray-400 mb-6">
            Follow feature coming soon! Explore creators and follow your favorites.
          </p>
          <Link
            href="/explore"
            className="inline-block px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Explore Creators
          </Link>
        </div>
      </main>
    </div>
  );
}
