'use client';

import { useState } from 'react';

// Draft type for when users create something
interface Draft {
  id: number;
  title: string;
  prompt: string;
  thumbnail: string;
  createdAt: string;
  status: string;
}

export default function ScenesPage() {
  // Start with empty drafts - will be populated when users create content
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const handleDelete = (id: number) => {
    setDrafts(drafts.filter(d => d.id !== id));
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan to-magenta bg-clip-text text-transparent">
              My Drafts
            </span>
          </h1>
          <p className="text-gray-400">Your saved drafts and works in progress</p>
        </div>

        {/* Drafts Grid */}
        {drafts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-surface rounded-2xl overflow-hidden hover:ring-2 ring-cyan/50 transition-all duration-300 group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-6xl">
                  {draft.thumbnail}
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg">{draft.title}</h3>
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                      Draft
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {draft.prompt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>📅 {draft.createdAt}</span>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                    <a
                      href="/create"
                      className="flex-1 py-2 text-center bg-cyan/20 text-cyan rounded-lg text-sm font-medium hover:bg-cyan/30 transition-colors"
                    >
                      ✏️ Edit
                    </a>
                    <button
                      onClick={() => handleDelete(draft.id)}
                      className="flex-1 py-2 text-center bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📂</div>
            <h2 className="text-2xl font-bold mb-2">No saved scenes yet</h2>
            <p className="text-gray-400 mb-6">Start creating and save your drafts here!</p>
            <a
              href="/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              Create Your First Scene
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
