'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Segment {
  id: string;
  orderIndex: number;
  prompt: string;
  status: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  expandedScript: any;
  duration: number | null;
  createdAt: string;
}

interface Scene {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  segments: Segment[];
  topic?: { id: string; title: string };
  creator?: { username: string };
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function ScenePage() {
  const params = useParams();
  const sceneId = params.id as string;
  
  const [scene, setScene] = useState<Scene | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [continuePrompt, setContinuePrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function fetchScene() {
      try {
        const res = await fetch(`${API_BASE}/scenes/${sceneId}`);
        if (res.ok) {
          const data = await res.json();
          // API returns scene directly, not wrapped in data.data
          setScene(data);
        } else {
          console.error('Scene not found, status:', res.status);
        }
      } catch (error) {
        console.error('Failed to fetch scene:', error);
      } finally {
        setLoading(false);
      }
    }
    if (sceneId) fetchScene();
  }, [sceneId]);

  // Auto-poll for segment status updates when there are pending/processing segments
  useEffect(() => {
    if (!scene) return;
    
    const hasPendingSegments = scene.segments.some(
      s => s.status === 'PENDING' || s.status === 'PROCESSING'
    );
    
    if (!hasPendingSegments) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/scenes/${sceneId}`);
        if (res.ok) {
          const data = await res.json();
          setScene(data);
          
          // Check if all segments are done
          const stillPending = data.segments.some(
            (s: Segment) => s.status === 'PENDING' || s.status === 'PROCESSING'
          );
          if (!stillPending) {
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Failed to poll scene:', error);
      }
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(interval);
  }, [scene, sceneId]);

  // Auto-play next segment
  const handleVideoEnded = () => {
    const completedSegments = scene?.segments.filter(s => s.status === 'COMPLETED' && s.videoUrl) || [];
    if (currentSegmentIndex < completedSegments.length - 1) {
      setCurrentSegmentIndex(currentSegmentIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleContinue = async () => {
    if (!continuePrompt.trim()) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const lastSegment = scene?.segments[scene.segments.length - 1];
      const nextOrderIndex = (lastSegment?.orderIndex || 0) + 1;

      const res = await fetch(`${API_BASE}/segments/submit-and-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sceneId,
          prompt: continuePrompt,
          orderIndex: nextOrderIndex,
        }),
      });

      if (res.ok) {
        setShowContinueModal(false);
        setContinuePrompt('');
        // Refresh scene data
        const sceneRes = await fetch(`${API_BASE}/scenes/${sceneId}`);
        const data = await sceneRes.json();
        setScene(data.data);
        alert('Segment submitted! Video generation started. Refresh in a minute to see the result.');
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to submit segment');
      }
    } catch (error) {
      console.error('Failed to continue scene:', error);
      alert('Failed to submit. Make sure you are logged in.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
          </div>
        </div>
      </main>
    );
  }

  if (!scene) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Scene not found</h1>
          <Link href="/explore" className="btn-primary">
            Back to Explore
          </Link>
        </div>
      </main>
    );
  }

  const completedSegments = scene.segments.filter(s => s.status === 'COMPLETED' && s.videoUrl);
  const pendingSegments = scene.segments.filter(s => s.status !== 'COMPLETED');
  const currentVideo = completedSegments[currentSegmentIndex];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/explore" className="text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Explore
          </Link>
          <h1 className="text-3xl font-bold">{scene.title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{scene.description}</p>
          {scene.topic && (
            <span className="inline-block mt-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
              {scene.topic.title}
            </span>
          )}
        </div>

        {/* Video Player */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {currentVideo?.videoUrl ? (
                <video
                  ref={videoRef}
                  src={currentVideo.videoUrl}
                  className="w-full h-full"
                  controls
                  autoPlay={isPlaying}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <p className="text-xl mb-2">🎬</p>
                    <p>No videos yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Segment Info */}
            {currentVideo && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold mb-2">Segment {currentSegmentIndex + 1}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentVideo.prompt}</p>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={() => setShowContinueModal(true)}
              className="mt-4 w-full btn-primary py-3 text-lg"
            >
              ✨ Continue This Story
            </button>
          </div>

          {/* Segment Timeline */}
          <div className="lg:col-span-1">
            <h3 className="font-semibold mb-4">Timeline ({scene.segments.length} segments)</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {scene.segments.map((segment, idx) => {
                const isCompleted = segment.status === 'COMPLETED' && segment.videoUrl;
                const isCurrent = completedSegments[currentSegmentIndex]?.id === segment.id;
                
                return (
                  <div
                    key={segment.id}
                    onClick={() => {
                      if (isCompleted) {
                        const completedIdx = completedSegments.findIndex(s => s.id === segment.id);
                        if (completedIdx >= 0) setCurrentSegmentIndex(completedIdx);
                      }
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                        : isCompleted
                        ? 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'bg-gray-100 dark:bg-gray-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                        {segment.thumbnailUrl ? (
                          <img src={segment.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">
                            {segment.status === 'COMPLETED' ? '🎬' : segment.status === 'PROCESSING' ? '⏳' : '📝'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Segment {segment.orderIndex + 1}</p>
                        <p className="text-xs text-gray-500 truncate">{segment.prompt}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          segment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          segment.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                          segment.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {segment.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {pendingSegments.length > 0 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  {pendingSegments.length} segment(s) generating...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Continue Modal */}
      {showContinueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Continue the Story</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              What happens next? Describe the next scene and our AI will generate it.
            </p>
            <textarea
              value={continuePrompt}
              onChange={(e) => setContinuePrompt(e.target.value)}
              placeholder="The spaceship enters a mysterious nebula, where strange lights dance around the hull..."
              className="w-full h-32 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowContinueModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={submitting || !continuePrompt.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Generate Segment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
