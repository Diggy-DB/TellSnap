'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../src/lib/auth-context';
import { api } from '../../src/lib/api';

interface Scene {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  genre?: string;
  status: string;
  createdAt: string;
  segmentCount?: number;
}

export default function UploadsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchScenes() {
      if (!isAuthenticated) return;
      try {
        const data = await api.getScenes({ limit: 50 });
        setScenes((data.items || []) as unknown as Scene[]);
      } catch (error) {
        console.error('Failed to fetch scenes:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchScenes();
  }, [isAuthenticated]);

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
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📤</span>
            <div>
              <h1 className="text-3xl font-bold">My Uploads</h1>
              <p className="text-gray-400">{scenes.length} comics created</p>
            </div>
          </div>
          <Link
            href="/create"
            className="px-4 py-2 bg-gradient-to-r from-magenta to-cyan text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            + New Comic
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : scenes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className="bg-surface border border-gray-700 rounded-xl overflow-hidden hover:border-cyan transition-all"
              >
                <Link href={`/scene/${scene.id}`}>
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {scene.thumbnailUrl ? (
                      <img
                        src={scene.thumbnailUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-magenta/30 to-cyan/30 flex items-center justify-center">
                        <span className="text-4xl">🎨</span>
                      </div>
                    )}
                    <div
                      className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${
                        scene.status === 'completed'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : scene.status === 'generating'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {scene.status === 'completed' ? '✓ Published' : scene.status === 'generating' ? '⏳ Generating' : '📝 Draft'}
                    </div>
                  </div>
                </Link>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{scene.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <span>{scene.segmentCount || 1} pages</span>
                    {scene.genre && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{scene.genre}</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/scene/${scene.id}`}
                      className="flex-1 px-3 py-2 bg-gray-700 text-center rounded-lg text-sm hover:bg-gray-600 transition-colors"
                    >
                      View
                    </Link>
                    <Link
                      href={`/scene/${scene.id}`}
                      className="flex-1 px-3 py-2 bg-cyan/20 text-cyan text-center rounded-lg text-sm hover:bg-cyan/30 transition-colors"
                    >
                      Continue
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold mb-2">No uploads yet</h3>
            <p className="text-gray-400 mb-6">Create your first comic to see it here!</p>
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Create Your First Comic
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
