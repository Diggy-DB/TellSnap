'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../src/lib/api';

interface Scene {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  status: string;
  segmentCount?: number;
  createdAt: string;
}

export default function ScenesPage() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScenes() {
      try {
        const data = await api.getScenes({ limit: 50 });
        setScenes((data.items as Scene[]) || []);
      } catch (error) {
        console.error('Failed to fetch scenes:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchScenes();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan to-magenta bg-clip-text text-transparent">
              Browse Comics
            </span>
          </h1>
          <p className="text-gray-400">Explore AI-generated comic stories</p>
        </div>

        {/* Scenes Grid */}
        {scenes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene) => (
              <Link
                key={scene.id}
                href={`/scene/${scene.id}`}
                className="bg-surface rounded-2xl overflow-hidden hover:ring-2 ring-cyan/50 transition-all duration-300 group"
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden">
                  {scene.thumbnailUrl ? (
                    <img src={scene.thumbnailUrl} alt={scene.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <span className="text-6xl">🎨</span>
                  )}
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg line-clamp-1">{scene.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      scene.status === 'PUBLISHED' 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {scene.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {scene.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-2xl font-bold mb-2">No comics yet</h2>
            <p className="text-gray-400 mb-6">Be the first to create a comic!</p>
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              Create Your First Comic
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
