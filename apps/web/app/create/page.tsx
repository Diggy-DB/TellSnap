'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Topic {
  id: string;
  title: string;
  slug: string;
  description: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function CreatePage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topicId: '',
    customTopic: '',
    customTopicDescription: '',
    initialPrompt: '',
  });

  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch(`${API_BASE}/topics`);
        const data = await res.json();
        setTopics(data.data || []);
      } catch (error) {
        console.error('Failed to fetch topics:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTopics();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      router.push('/login');
      return;
    }

    setSubmitting(true);
    try {
      let topicId = formData.topicId;

      // If using custom topic, create it first
      if (useCustomTopic && formData.customTopic) {
        const topicRes = await fetch(`${API_BASE}/topics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: formData.customTopic,
            description: formData.customTopicDescription || `Stories about ${formData.customTopic}`,
          }),
        });

        if (topicRes.ok) {
          const topicData = await topicRes.json();
          console.log('Created topic:', topicData);
          topicId = topicData.id || topicData.data?.id;
          if (!topicId) {
            alert('Failed to get topic ID from response');
            setSubmitting(false);
            return;
          }
        } else {
          const error = await topicRes.json();
          alert(error.message || 'Failed to create topic');
          setSubmitting(false);
          return;
        }
      }

      // Validate topicId before creating scene
      if (!topicId) {
        alert('Please select or create a topic');
        setSubmitting(false);
        return;
      }

      console.log('Creating scene with topicId:', topicId);
      const res = await fetch(`${API_BASE}/scenes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          topicId,
          initialPrompt: formData.initialPrompt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // API returns { scene, segment, job } directly
        router.push(`/scene/${data.scene.id}`);
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to create scene');
      }
    } catch (error) {
      console.error('Failed to create scene:', error);
      alert('Failed to create scene');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/explore" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Explore
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">Create New Scene</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Start a new collaborative story. Others can continue where you leave off!
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Scene Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="The Last Voyage of the Starship Nova"
              className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="A gripping sci-fi adventure about a crew facing the unknown..."
              className="w-full h-24 p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 resize-none"
              required
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium mb-2">Topic</label>
            
            {/* Toggle between existing and custom topic */}
            <div className="flex gap-4 mb-3">
              <button
                type="button"
                onClick={() => setUseCustomTopic(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  !useCustomTopic 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Choose Existing
              </button>
              <button
                type="button"
                onClick={() => setUseCustomTopic(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  useCustomTopic 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Create New Topic
              </button>
            </div>

            {!useCustomTopic ? (
              <select
                value={formData.topicId}
                onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                required={!useCustomTopic}
              >
                <option value="">Select a topic...</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.customTopic}
                  onChange={(e) => setFormData({ ...formData, customTopic: e.target.value })}
                  placeholder="Enter your new topic (e.g., Space Exploration, Medieval Fantasy)"
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  required={useCustomTopic}
                />
                <input
                  type="text"
                  value={formData.customTopicDescription}
                  onChange={(e) => setFormData({ ...formData, customTopicDescription: e.target.value })}
                  placeholder="Brief description of this topic (optional)"
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
            )}
          </div>

          {/* Initial Prompt */}
          <div>
            <label className="block text-sm font-medium mb-2">First Scene Prompt</label>
            <textarea
              value={formData.initialPrompt}
              onChange={(e) => setFormData({ ...formData, initialPrompt: e.target.value })}
              placeholder="The massive starship emerges from hyperspace, its hull scarred from countless battles. Inside the bridge, Captain Nova stares at the unknown planet ahead..."
              className="w-full h-40 p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 resize-none"
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              Describe the opening scene. Be descriptive - this will be expanded by AI and turned into video!
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full btn-primary py-3 text-lg disabled:opacity-50"
          >
            {submitting ? 'Creating...' : '🎬 Create Scene & Generate Video'}
          </button>
        </form>
      </div>
    </main>
  );
}
