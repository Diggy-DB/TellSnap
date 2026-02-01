'use client';

import React, { useState } from 'react';
import Header from '../../src/components/Header';

// Empty by default - comics appear here once user creates and uploads them
const userComics: { id: number; title: string; cover: string; likes: number; views: number }[] = [];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('comics');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Profile Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-48 bg-gradient-to-r from-magenta/30 via-cyan/20 to-magenta/30" />
        
        {/* Profile Info */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative -mt-16 mb-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan to-magenta p-1">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-4xl font-bold">
                C
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1">Creator123</h1>
              <p className="text-gray-400 mb-3">@creator123</p>
              <p className="text-gray-300 max-w-md">
                Comic creator and storyteller ✨ Making stories come to life one panel at a time. 
                Fan of action, romance, and everything in between!
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                <span>📍 San Francisco, CA</span>
                <span>📅 Joined January 2026</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="/settings"
                className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Edit Profile
              </a>
              <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                ⋮
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 py-4 border-y border-gray-700 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-400">Comics</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-400">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">6</div>
              <div className="text-sm text-gray-400">Following</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-400">Total Views</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('comics')}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === 'comics'
                  ? 'text-cyan border-b-2 border-cyan'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Comics
            </button>
            <button
              onClick={() => setActiveTab('liked')}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === 'liked'
                  ? 'text-cyan border-b-2 border-cyan'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Liked
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === 'about'
                  ? 'text-cyan border-b-2 border-cyan'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              About
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'comics' && (
          userComics.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {userComics.map((comic) => (
                <div
                  key={comic.id}
                  className="group bg-surface border border-gray-700 rounded-xl overflow-hidden hover:border-cyan transition-all"
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={comic.cover}
                      alt={comic.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium truncate">{comic.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>❤️ {comic.likes}</span>
                      <span>👁️ {comic.views}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold mb-2">No comics yet</h3>
              <p className="text-gray-400 mb-6">Create your first comic and it will appear here!</p>
              <a
                href="/create"
                className="inline-block px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Create Your First Comic
              </a>
            </div>
          )
        )}

        {activeTab === 'liked' && (
          <div className="text-center py-12">
            <p className="text-gray-400">
              View all liked comics on the{' '}
              <a href="/likes" className="text-cyan hover:underline">
                Likes page
              </a>
            </p>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="bg-surface border border-gray-700 rounded-xl p-6">
              <h3 className="font-semibold mb-3">Bio</h3>
              <p className="text-gray-300">
                Comic creator and storyteller ✨ Making stories come to life one panel at a time. 
                Fan of action, romance, and everything in between! I started creating comics in 2025 
                and fell in love with the art form. When I'm not drawing, you can find me reading 
                manga or playing video games.
              </p>
            </div>
            <div className="bg-surface border border-gray-700 rounded-xl p-6">
              <h3 className="font-semibold mb-3">Favorite Genres</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-magenta/20 text-magenta rounded-full text-sm">Action</span>
                <span className="px-3 py-1 bg-cyan/20 text-cyan rounded-full text-sm">Romance</span>
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">Comedy</span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">Fantasy</span>
              </div>
            </div>
            <div className="bg-surface border border-gray-700 rounded-xl p-6">
              <h3 className="font-semibold mb-3">Social Links</h3>
              <div className="space-y-2">
                <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-cyan transition-colors">
                  <span>🐦</span> @creator123
                </a>
                <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-cyan transition-colors">
                  <span>📸</span> @creator123_art
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
