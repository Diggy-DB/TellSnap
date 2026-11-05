'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

interface Scene {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  genre?: string;
  status: string;
  createdBy?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

const genreColors: Record<string, string> = {
  action: 'bg-orange-500',
  romance: 'bg-pink-500',
  comedy: 'bg-yellow-500',
  thriller: 'bg-purple-600',
  'slice-of-life': 'bg-green-500',
  fantasy: 'bg-blue-500',
};

const genreEmojis: Record<string, string> = {
  action: '⚔️',
  romance: '💕',
  comedy: '😂',
  thriller: '🔮',
  'slice-of-life': '🌿',
  fantasy: '✨',
};

// Separate component to avoid nested <a> tags (hydration error)
function GenreBadge({ genre }: { genre?: string }) {
  const router = useRouter();
  
  if (!genre) return null;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/genres/${genre}`);
  };
  
  return (
    <span
      onClick={handleClick}
      className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold text-white cursor-pointer ${genreColors[genre] || 'bg-gray-600'} hover:scale-110 transition-transform z-10`}
    >
      {genreEmojis[genre] || '📚'} {genre}
    </span>
  );
}

export default function RecentComics() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScenes() {
      try {
        const data = await api.getScenes({ limit: 3 });
        setScenes((data.items || []) as unknown as Scene[]);
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
      <div className="bg-surface rounded-lg p-6">
        <h3 className="text-2xl font-bold mb-6">Your Recent Creations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-6 text-center">
        <h3 className="text-2xl font-bold mb-4">Your Recent Creations</h3>
        <p className="text-gray-400 mb-4">No comics created yet. Start your first story!</p>
        <Link
          href="/create"
          className="inline-block px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white font-bold rounded-xl hover:scale-105 transition-transform"
        >
          Create Your First Comic
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">Your Recent Creations</h3>
        <Link href="/scenes" className="text-cyan hover:underline text-sm">
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <span className="text-6xl">🎨</span>
                </div>
              )}
              {/* Genre Badge - Clickable */}
              <GenreBadge genre={scene.genre} />
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
              <div className="absolute inset-0 ring-2 ring-transparent group-hover:ring-cyan rounded-xl transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
