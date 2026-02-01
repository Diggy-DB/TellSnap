'use client';

import React, { useState } from 'react';
import Header from '../../src/components/Header';

const themes = [
  { id: 'dark', name: 'Dark', colors: ['#1a1a2e', '#16213e', '#0f3460'], description: 'Default dark theme' },
  { id: 'midnight', name: 'Midnight Blue', colors: ['#0a1628', '#1a2744', '#2a3f5f'], description: 'Deep blue night' },
  { id: 'purple', name: 'Purple Haze', colors: ['#1a0a2e', '#2d1b4e', '#4a2c7a'], description: 'Rich purple vibes' },
  { id: 'forest', name: 'Forest', colors: ['#0a1a14', '#1a2e24', '#2a4a3a'], description: 'Nature inspired' },
  { id: 'crimson', name: 'Crimson', colors: ['#1a0a0a', '#2e1a1a', '#4a2a2a'], description: 'Dark red aesthetic' },
  { id: 'light', name: 'Light', colors: ['#f5f5f5', '#e8e8e8', '#d0d0d0'], description: 'Clean light mode' },
];

export default function SettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Customize your StoryForge experience</p>

        {/* Theme Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🎨</span> Theme
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  selectedTheme === theme.id
                    ? 'border-cyan shadow-lg shadow-cyan/20'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex gap-1 mb-3">
                  {theme.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-lg"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="font-medium text-left">{theme.name}</p>
                <p className="text-xs text-gray-400 text-left">{theme.description}</p>
                {selectedTheme === theme.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-cyan rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Notifications Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🔔</span> Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-gray-700">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-gray-400">Get notified about likes, comments, and follows</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications ? 'bg-cyan' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-gray-700">
              <div>
                <p className="font-medium">Email Updates</p>
                <p className="text-sm text-gray-400">Receive weekly digest and feature updates</p>
              </div>
              <button
                onClick={() => setEmailUpdates(!emailUpdates)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  emailUpdates ? 'bg-cyan' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    emailUpdates ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>👤</span> Account
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-surface rounded-xl border border-gray-700">
              <label className="block text-sm text-gray-400 mb-2">Username</label>
              <input
                type="text"
                defaultValue="Creator123"
                className="w-full bg-black/30 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan"
              />
            </div>
            <div className="p-4 bg-surface rounded-xl border border-gray-700">
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                defaultValue="creator@example.com"
                className="w-full bg-black/30 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan"
              />
            </div>
            <div className="p-4 bg-surface rounded-xl border border-gray-700">
              <label className="block text-sm text-gray-400 mb-2">Bio</label>
              <textarea
                rows={3}
                defaultValue="Comic creator and storyteller ✨"
                className="w-full bg-black/30 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan resize-none"
              />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-400">
            <span>⚠️</span> Danger Zone
          </h2>
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="font-medium text-red-400 mb-2">Delete Account</p>
            <p className="text-sm text-gray-400 mb-4">Once deleted, your account and all your comics cannot be recovered.</p>
            <button className="px-4 py-2 bg-red-500/20 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
              Delete My Account
            </button>
          </div>
        </section>

        {/* Save Button */}
        <div className="mt-10 flex justify-end">
          <button className="px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
            Save Changes
          </button>
        </div>
      </main>
    </div>
  );
}
