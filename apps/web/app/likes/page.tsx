'use client';

import React from 'react';
import Header from '../../src/components/Header';

const likedPosts = [
  {
    id: 1,
    title: 'The Last Guardian',
    author: 'MangaMaster',
    cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=400&fit=crop',
    likes: 2453,
    genre: 'Action',
  },
  {
    id: 2,
    title: 'Midnight Romance',
    author: 'StarryNight',
    cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300&h=400&fit=crop',
    likes: 1829,
    genre: 'Romance',
  },
  {
    id: 3,
    title: 'Comedy Central',
    author: 'FunnyBones',
    cover: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?w=300&h=400&fit=crop',
    likes: 3102,
    genre: 'Comedy',
  },
  {
    id: 4,
    title: 'Shadow Protocol',
    author: 'DarkWriter',
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&h=400&fit=crop',
    likes: 1567,
    genre: 'Thriller',
  },
  {
    id: 5,
    title: 'Café Dreams',
    author: 'SoftVibes',
    cover: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=400&fit=crop',
    likes: 2891,
    genre: 'Slice of Life',
  },
  {
    id: 6,
    title: 'Dragon Realm',
    author: 'EpicTales',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=400&fit=crop',
    likes: 4521,
    genre: 'Fantasy',
  },
];

export default function LikesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">❤️</span>
          <div>
            <h1 className="text-3xl font-bold">Liked Comics</h1>
            <p className="text-gray-400">{likedPosts.length} comics you've liked</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {likedPosts.map((post) => (
            <div
              key={post.id}
              className="group bg-surface border border-gray-700 rounded-xl overflow-hidden hover:border-cyan transition-all hover:shadow-lg hover:shadow-cyan/10"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={post.cover}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded-lg text-xs">
                  {post.genre}
                </div>
                <button className="absolute top-2 left-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-sm">❤️</span>
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-1 truncate">{post.title}</h3>
                <p className="text-sm text-gray-400 mb-2">by {post.author}</p>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>❤️</span>
                  <span>{post.likes.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
