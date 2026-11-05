'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../src/lib/api';

interface Scene {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  genre?: string;
  createdBy?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

const genreInfo: Record<string, { name: string; emoji: string; color: string; bgColor: string; description: string }> = {
  action: { name: 'Action', emoji: '⚔️', color: 'text-orange-500', bgColor: 'bg-orange-500', description: 'Epic battles, intense fights, and thrilling adventures' },
  romance: { name: 'Romance', emoji: '💕', color: 'text-pink-500', bgColor: 'bg-pink-500', description: 'Love stories, relationships, and heartwarming tales' },
  comedy: { name: 'Comedy', emoji: '😂', color: 'text-yellow-500', bgColor: 'bg-yellow-500', description: 'Funny moments, humor, and lighthearted fun' },
  thriller: { name: 'Thriller', emoji: '🔮', color: 'text-purple-500', bgColor: 'bg-purple-600', description: 'Suspenseful mysteries, dark twists, and edge-of-your-seat tension' },
  'slice-of-life': { name: 'Slice of Life', emoji: '🌿', color: 'text-green-500', bgColor: 'bg-green-500', description: 'Everyday moments, personal growth, and relatable experiences' },
  fantasy: { name: 'Fantasy', emoji: '✨', color: 'text-blue-500', bgColor: 'bg-blue-500', description: 'Magic, mythical creatures, and otherworldly adventures' },
};

export default function GenreDetailPage() {
  const params = useParams();
  const genreId = params.id as string;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  const genre = genreInfo[genreId] || { name: genreId, emoji: '📚', color: 'text-gray-500', bgColor: 'bg-gray-500', description: '' };

  useEffect(() => {
    async function fetchScenes() {
      try {
        // Use server-side genre filtering
        const data = await api.getScenes({ genre: genreId, limit: 50 });
        setScenes((data.items || []) as Scene[]);
      } catch (error) {
        console.error('Failed to fetch scenes:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchScenes();
  }, [genreId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/genres" className="text-cyan hover:underline text-sm mb-4 inline-block">
          ← Back to Genres
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-6xl">{genre.emoji}</span>
          <div>
            <h1 className={`text-4xl font-bold ${genre.color}`}>{genre.name}</h1>
            <p className="text-gray-400 mt-1">{genre.description}</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && scenes.length === 0 && (
        <div className="text-center py-16">
          <span className="text-6xl mb-4 block">{genre.emoji}</span>
          <h2 className="text-2xl font-bold mb-2">No {genre.name} Comics Yet</h2>
          <p className="text-gray-400 mb-6">Be the first to create a {genre.name.toLowerCase()} comic!</p>
          <Link
            href="/create"
            className="inline-block px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white font-bold rounded-xl hover:scale-105 transition-transform"
          >
            Create a Comic
          </Link>
        </div>
      )}

      {/* Comics Grid */}
      {!loading && scenes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {scenes.map((scene) => (
            <Link
              key={scene.id}
              href={`/scene/${scene.id}`}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 shadow-lg">
                {scene.thumbnailUrl ? (
                  <img
                    src={scene.thumbnailUrl}
                    alt={scene.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-magenta/30 to-cyan/30 flex items-center justify-center">
                    <span className="text-5xl">🎨</span>
                  </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                {/* Title at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className="text-white font-bold text-lg drop-shadow-lg line-clamp-2">{scene.title}</h4>
                  {scene.createdBy && (
                    <p className="text-gray-300 text-sm mt-1">by {scene.createdBy.username}</p>
                  )}
                </div>
                {/* Hover Ring */}
                <div className={`absolute inset-0 ring-2 ring-transparent group-hover:ring-2 ${genre.color.replace('text-', 'group-hover:ring-')} rounded-xl transition-all`} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
