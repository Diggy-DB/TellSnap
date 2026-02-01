'use client';

import React from 'react';
import Header from '../../src/components/Header';

const followingUsers = [
  {
    id: 1,
    username: 'MangaMaster',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    bio: 'Action comic specialist. 500+ chapters published.',
    followers: 12500,
    comics: 23,
    isFollowing: true,
  },
  {
    id: 2,
    username: 'StarryNight',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    bio: 'Romance & Drama storyteller ✨',
    followers: 8900,
    comics: 15,
    isFollowing: true,
  },
  {
    id: 3,
    username: 'FunnyBones',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop',
    bio: 'Making you laugh one panel at a time 😂',
    followers: 21000,
    comics: 42,
    isFollowing: true,
  },
  {
    id: 4,
    username: 'DarkWriter',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    bio: 'Thriller & Mystery comics. Prepare for plot twists.',
    followers: 6700,
    comics: 8,
    isFollowing: true,
  },
  {
    id: 5,
    username: 'SoftVibes',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    bio: 'Cozy slice of life stories 🌸',
    followers: 15200,
    comics: 31,
    isFollowing: true,
  },
  {
    id: 6,
    username: 'EpicTales',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    bio: 'Fantasy worldbuilder. Dragons are my specialty 🐉',
    followers: 34500,
    comics: 19,
    isFollowing: true,
  },
];

export default function FollowingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">👥</span>
          <div>
            <h1 className="text-3xl font-bold">Following</h1>
            <p className="text-gray-400">{followingUsers.length} creators you follow</p>
          </div>
        </div>

        <div className="space-y-4">
          {followingUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 bg-surface border border-gray-700 rounded-xl hover:border-gray-500 transition-colors"
            >
              <img
                src={user.avatar}
                alt={user.username}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">{user.username}</h3>
                <p className="text-sm text-gray-400 truncate">{user.bio}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>{user.followers.toLocaleString()} followers</span>
                  <span>•</span>
                  <span>{user.comics} comics</span>
                </div>
              </div>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  user.isFollowing
                    ? 'bg-gray-700 text-white hover:bg-red-500/20 hover:text-red-400'
                    : 'bg-cyan text-black hover:bg-cyan/80'
                }`}
              >
                {user.isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
