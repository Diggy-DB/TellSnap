'use client';

import Link from 'next/link';

const genres = [
  { id: 'action', name: 'Action', emoji: '⚔️', color: 'from-orange-500 to-red-600', description: 'Epic battles, intense fights, and thrilling adventures' },
  { id: 'romance', name: 'Romance', emoji: '💕', color: 'from-pink-400 to-rose-500', description: 'Love stories, relationships, and heartwarming tales' },
  { id: 'comedy', name: 'Comedy', emoji: '😂', color: 'from-yellow-400 to-orange-500', description: 'Funny moments, humor, and lighthearted fun' },
  { id: 'thriller', name: 'Thriller', emoji: '🔮', color: 'from-purple-600 to-indigo-700', description: 'Suspenseful mysteries, dark twists, and edge-of-your-seat tension' },
  { id: 'slice-of-life', name: 'Slice of Life', emoji: '🌿', color: 'from-green-400 to-teal-500', description: 'Everyday moments, personal growth, and relatable experiences' },
  { id: 'fantasy', name: 'Fantasy', emoji: '✨', color: 'from-blue-400 to-cyan-500', description: 'Magic, mythical creatures, and otherworldly adventures' },
];

export default function GenresPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Browse by Genre</h1>
        <p className="text-gray-400">Discover comics organized by their story genre</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {genres.map((genre) => (
          <Link
            key={genre.id}
            href={`/genres/${genre.id}`}
            className="group relative overflow-hidden rounded-2xl aspect-[4/3] shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${genre.color}`} />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <span className="text-5xl mb-3">{genre.emoji}</span>
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">{genre.name}</h2>
              <p className="text-white/80 text-sm mt-2 line-clamp-2">{genre.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
