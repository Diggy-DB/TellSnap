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
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('comics');
  const [userComics, setUserComics] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchUserComics() {
      if (!isAuthenticated) return;
      try {
        const data = await api.getScenes({ limit: 50 });
        setUserComics((data.items || []) as unknown as Scene[]);
      } catch (error) {
        console.error('Failed to fetch user comics:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserComics();
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

  const initial = user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-magenta/30 via-cyan/20 to-magenta/30" />
        
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative -mt-16 mb-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan to-magenta p-1">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-4xl font-bold">
                  {initial}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1">{user.username}</h1>
              <p className="text-gray-400 mb-3">@{user.username?.toLowerCase()}</p>
              <p className="text-gray-300 max-w-md">Comic creator and storyteller</p>
            </div>
            <div className="flex gap-2">
              <Link href="/settings" className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors">
                Edit Profile
              </Link>
            </div>
          </div>

          <div className="flex gap-8 py-4 border-y border-gray-700 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{userComics.length}</div>
              <div className="text-sm text-gray-400">Comics</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-400">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-400">Following</div>
            </div>
          </div>

          <div className="flex gap-6 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('comics')}
              className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'comics' ? 'text-cyan border-b-2 border-cyan' : 'text-gray-400 hover:text-white'}`}
            >
              Comics
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'about' ? 'text-cyan border-b-2 border-cyan' : 'text-gray-400 hover:text-white'}`}
            >
              About
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'comics' && (
          loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : userComics.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {userComics.map((comic) => (
                <Link
                  key={comic.id}
                  href={`/scene/${comic.id}`}
                  className="group bg-surface border border-gray-700 rounded-xl overflow-hidden hover:border-cyan transition-all"
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {comic.thumbnailUrl ? (
                      <img
                        src={comic.thumbnailUrl}
                        alt={comic.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-magenta/30 to-cyan/30 flex items-center justify-center">
                        <span className="text-4xl">🎨</span>
                      </div>
                    )}
                    {comic.genre && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded-lg text-xs">{comic.genre}</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium truncate">{comic.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 capitalize">{comic.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold mb-2">No comics yet</h3>
              <p className="text-gray-400 mb-6">Create your first comic and it will appear here!</p>
              <Link
                href="/create"
                className="inline-block px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Create Your First Comic
              </Link>
            </div>
          )
        )}

        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="bg-surface border border-gray-700 rounded-xl p-6">
              <h3 className="font-semibold mb-3">Account Info</h3>
              <div className="space-y-2 text-gray-300">
                <p><span className="text-gray-500">Email:</span> {user.email}</p>
                <p><span className="text-gray-500">Username:</span> {user.username}</p>
                <p><span className="text-gray-500">Role:</span> {user.role}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
