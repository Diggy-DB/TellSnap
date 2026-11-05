'use client';

import Link from 'next/link';

const genres = [
  { id: 'action', name: 'Action', emoji: '⚔️', color: 'from-orange-500 to-red-600' },
  { id: 'romance', name: 'Romance', emoji: '💕', color: 'from-pink-400 to-rose-500' },
  { id: 'comedy', name: 'Comedy', emoji: '😂', color: 'from-yellow-400 to-orange-500' },
  { id: 'thriller', name: 'Thriller', emoji: '🔮', color: 'from-purple-600 to-indigo-700' },
  { id: 'slice-of-life', name: 'Slice of Life', emoji: '🌿', color: 'from-green-400 to-teal-500' },
  { id: 'fantasy', name: 'Fantasy', emoji: '✨', color: 'from-blue-400 to-cyan-500' },
];

export default function GenreCards() {
  return (
    <div className="bg-surface rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">Browse by Genre</h3>
        <Link href="/genres" className="text-cyan hover:underline text-sm">
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {genres.map((genre) => (
          <Link
            key={genre.id}
            href={`/genres/${genre.id}`}
            className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${genre.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
              <span className="text-2xl">{genre.emoji}</span>
            </div>
            <span className="text-xs font-medium text-gray-300 text-center">{genre.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
