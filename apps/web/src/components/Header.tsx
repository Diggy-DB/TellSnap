'use client';

import React, { useState } from 'react';

export default function Header(){
  // Mock user state - replace with real auth later
  const isLoggedIn = true;
  const username = "Creator123";
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="site-header py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-magenta to-cyan flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" fill="#ffd700"/>
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold">StoryForge</div>
            </div>
          </a>
        </div>

        {/* Search + Navigation + User */}
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-4 text-sm text-gray-300">
            <a className="hover:text-cyan transition-colors" href="/">Home</a>
            <a className="hover:text-cyan transition-colors" href="/scenes">Scenes</a>
          </nav>

          {/* Search Bar */}
          <div className="hidden sm:flex items-center bg-black/30 border border-gray-700 rounded-lg px-3 py-1.5">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search stories..."
              className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none w-32 lg:w-48"
            />
          </div>

          {/* User Section */}
          {isLoggedIn ? (
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-magenta flex items-center justify-center text-xs font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:block text-sm text-gray-300">{username}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-sm font-medium">{username}</p>
                    <p className="text-xs text-gray-400">@{username.toLowerCase()}</p>
                  </div>
                  <div className="py-2">
                    <a href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <span>👤</span> Profile
                    </a>
                    <a href="/uploads" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <span>📤</span> My Uploads
                    </a>
                    <a href="/likes" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <span>❤️</span> Liked
                    </a>
                    <a href="/following" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <span>👥</span> Following
                    </a>
                    <a href="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <span>⚙️</span> Settings
                    </a>
                  </div>
                  <div className="border-t border-gray-700 py-2">
                    <button className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors w-full">
                      <span>🚪</span> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a href="/login" className="text-sm text-gray-300 hover:text-cyan transition-colors">
                Login
              </a>
              <a href="/signup" className="text-sm px-3 py-1.5 bg-cyan text-black rounded-lg font-medium hover:bg-cyan/80 transition-colors">
                Sign Up
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
