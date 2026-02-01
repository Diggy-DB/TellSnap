'use client';

import React from 'react';
import Header from '../../src/components/Header';

const myUploads = [
  {
    id: 1,
    title: 'My Hero Journey',
    cover: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=300&h=400&fit=crop',
    status: 'published',
    views: 1234,
    likes: 89,
    chapters: 5,
    updatedAt: '2 days ago',
  },
  {
    id: 2,
    title: 'Summer Memories',
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=400&fit=crop',
    status: 'published',
    views: 567,
    likes: 45,
    chapters: 3,
    updatedAt: '1 week ago',
  },
  {
    id: 3,
    title: 'Mystery at Midnight',
    cover: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=300&h=400&fit=crop',
    status: 'draft',
    views: 0,
    likes: 0,
    chapters: 1,
    updatedAt: '3 days ago',
  },
];

export default function UploadsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📤</span>
            <div>
              <h1 className="text-3xl font-bold">My Uploads</h1>
              <p className="text-gray-400">{myUploads.length} comics created</p>
            </div>
          </div>
          <a
            href="/create"
            className="px-4 py-2 bg-gradient-to-r from-magenta to-cyan text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            + New Comic
          </a>
        </div>

        {myUploads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myUploads.map((comic) => (
              <div
                key={comic.id}
                className="bg-surface border border-gray-700 rounded-xl overflow-hidden hover:border-cyan transition-all"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={comic.cover}
                    alt={comic.title}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium ${
                      comic.status === 'published'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}
                  >
                    {comic.status === 'published' ? '✓ Published' : '📝 Draft'}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{comic.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <span>{comic.chapters} chapters</span>
                    <span>•</span>
                    <span>Updated {comic.updatedAt}</span>
                  </div>
                  {comic.status === 'published' && (
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <span>👁️</span> {comic.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>❤️</span> {comic.likes}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-cyan/20 text-cyan border border-cyan/30 rounded-lg text-sm font-medium hover:bg-cyan/30 transition-colors">
                      Edit
                    </button>
                    <button className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors">
                      ⋮
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold mb-2">No uploads yet</h2>
            <p className="text-gray-400 mb-6">Start creating your first comic!</p>
            <a
              href="/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Create Your First Comic
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
