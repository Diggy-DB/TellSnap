'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ThemeSwitch from './ThemeSwitch';

export default function Header() {
  const [user, setUser] = useState<{ email: string; username?: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white">
              SF
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              StoryForge
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/explore" className="hover:text-blue-600 transition-colors">
              Explore
            </Link>
            <Link href="/create" className="hover:text-blue-600 transition-colors">
              Create
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeSwitch />
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.username || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:underline"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-sm">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
