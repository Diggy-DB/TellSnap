'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Scene {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  segmentCount: number;
  createdAt: string;
  topic?: { title: string };
}

interface Topic {
  id: string;
  title: string;
  slug: string;
  description: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function ExplorePage() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch topics
        const topicsRes = await fetch(`${API_BASE}/topics`);
        const topicsData = await topicsRes.json();
        setTopics(topicsData.data || []);

        // Fetch scenes
        const scenesUrl = selectedTopic 
          ? `${API_BASE}/scenes?topicId=${selectedTopic}`
          : `${API_BASE}/scenes`;
        const scenesRes = await fetch(scenesUrl);
        const scenesData = await scenesRes.json();
        setScenes(scenesData.data?.items || scenesData.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedTopic]);

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Explore Stories</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Explore Stories</h1>
          <Link href="/create" className="btn-primary">
            + Create New Scene
          </Link>
        </div>

        {/* Topic Filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setSelectedTopic(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedTopic
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedTopic === topic.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {topic.title}
            </button>
          ))}
        </div>

        {/* Scenes Grid */}
        {scenes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-gray-500 mb-4">No stories yet</p>
            <Link href="/create" className="btn-primary">
              Be the first to create one!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene) => (
              <Link key={scene.id} href={`/scene/${scene.id}`}>
                <div className="card hover:shadow-lg transition-shadow cursor-pointer group">
                  <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-4 overflow-hidden">
                    {scene.thumbnailUrl ? (
                      <img
                        src={scene.thumbnailUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-4xl">
                        🎬
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {scene.segmentCount || 0} segments
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                    {scene.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                    {scene.description}
                  </p>
                  {scene.topic && (
                    <span className="inline-block mt-3 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {scene.topic.title}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
