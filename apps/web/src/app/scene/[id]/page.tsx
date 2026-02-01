'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Segment {
  id: string;
  orderIndex: number;
  prompt: string;
  status: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  numPanels: number | null;
  comicStyle: string | null;
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
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [continuePrompt, setContinuePrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'scroll' | 'page'>('scroll'); // Scroll or page-by-page
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    async function fetchScene() {
      try {
        const res = await fetch(`${API_BASE}/scenes/${sceneId}`);
        const data = await res.json();
        setScene(data.data || data);
      } catch (error) {
        console.error('Failed to fetch scene:', error);
      } finally {
        setLoading(false);
      }
    }
    if (sceneId) fetchScene();
  }, [sceneId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'page') return;
      const completedPages = scene?.segments.filter(s => s.status === 'COMPLETED' && s.imageUrl) || [];
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentPageIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        setCurrentPageIndex(prev => Math.min(completedPages.length - 1, prev + 1));
      } else if (e.key === 'Escape') {
        setFullscreen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, scene]);

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
        setScene(data.data || data);
        alert('New page queued! Comic generation started. Refresh in a minute to see the result.');
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
            <div className="h-[600px] bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
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

  const completedPages = scene.segments.filter(s => s.status === 'COMPLETED' && s.imageUrl);
  const pendingPages = scene.segments.filter(s => s.status !== 'COMPLETED');
  const currentPage = completedPages[currentPageIndex];

  return (
    <main className={`min-h-screen ${fullscreen ? 'p-0' : 'p-8'}`}>
      <div className={`${fullscreen ? '' : 'max-w-6xl mx-auto'}`}>
        {/* Header */}
        {!fullscreen && (
          <div className="mb-6">
            <Link href="/explore" className="text-blue-600 hover:underline mb-2 inline-block">
              ← Back to Explore
            </Link>
            <h1 className="text-3xl font-bold">{scene.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{scene.description}</p>
            <div className="flex items-center gap-4 mt-3">
              {scene.topic && (
                <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                  {scene.topic.title}
                </span>
              )}
              <span className="text-sm text-gray-500">
                {completedPages.length} page{completedPages.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* View Mode Toggle */}
        {!fullscreen && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('scroll')}
                className={`px-4 py-2 rounded-lg ${viewMode === 'scroll' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                📜 Scroll View
              </button>
              <button
                onClick={() => setViewMode('page')}
                className={`px-4 py-2 rounded-lg ${viewMode === 'page' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                📖 Page View
              </button>
            </div>
            {viewMode === 'page' && (
              <button
                onClick={() => setFullscreen(!fullscreen)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
              >
                {fullscreen ? '⬜ Exit Fullscreen' : '🔲 Fullscreen'}
              </button>
            )}
          </div>
        )}

        {/* Comic Viewer */}
        {viewMode === 'scroll' ? (
          /* Scroll View - All pages stacked vertically (webtoon style) */
          <div className="space-y-4">
            {completedPages.length === 0 ? (
              <div className="h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <p className="text-4xl mb-2">📚</p>
                  <p className="text-gray-500">No pages yet</p>
                  {pendingPages.length > 0 && (
                    <p className="text-sm text-gray-400 mt-2">
                      {pendingPages.length} page(s) generating...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              completedPages.map((page, idx) => (
                <div key={page.id} className="relative">
                  <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm z-10">
                    Page {idx + 1}
                  </div>
                  <img
                    src={page.imageUrl!}
                    alt={`Page ${idx + 1}: ${page.prompt}`}
                    className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
                    loading="lazy"
                  />
                </div>
              ))
            )}
          </div>
        ) : (
          /* Page View - One page at a time with navigation */
          <div className={`relative ${fullscreen ? 'h-screen flex items-center justify-center bg-black' : ''}`}>
            {currentPage?.imageUrl ? (
              <>
                <img
                  src={currentPage.imageUrl}
                  alt={`Page ${currentPageIndex + 1}: ${currentPage.prompt}`}
                  className={`${fullscreen ? 'max-h-screen w-auto' : 'w-full max-w-3xl mx-auto'} rounded-lg shadow-xl`}
                />
                
                {/* Navigation Arrows */}
                <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
                  <button
                    onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentPageIndex === 0}
                    className={`pointer-events-auto p-4 bg-black/30 hover:bg-black/50 text-white rounded-r-lg disabled:opacity-30 ${fullscreen ? 'text-4xl' : 'text-2xl'}`}
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => setCurrentPageIndex(prev => Math.min(completedPages.length - 1, prev + 1))}
                    disabled={currentPageIndex >= completedPages.length - 1}
                    className={`pointer-events-auto p-4 bg-black/30 hover:bg-black/50 text-white rounded-l-lg disabled:opacity-30 ${fullscreen ? 'text-4xl' : 'text-2xl'}`}
                  >
                    ▶
                  </button>
                </div>
                
                {/* Page Counter */}
                <div className={`absolute ${fullscreen ? 'bottom-8 left-1/2 -translate-x-1/2' : 'bottom-4 left-1/2 -translate-x-1/2'} bg-black/60 text-white px-4 py-2 rounded-full`}>
                  {currentPageIndex + 1} / {completedPages.length}
                </div>
                
                {/* Close fullscreen button */}
                {fullscreen && (
                  <button
                    onClick={() => setFullscreen(false)}
                    className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black/80"
                  >
                    ✕
                  </button>
                )}
              </>
            ) : (
              <div className="h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <p className="text-4xl mb-2">📚</p>
                  <p className="text-gray-500">No pages yet</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Page Info (in page mode) */}
        {viewMode === 'page' && currentPage && !fullscreen && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-3xl mx-auto">
            <h3 className="font-semibold mb-2">Page {currentPageIndex + 1}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{currentPage.prompt}</p>
            {currentPage.numPanels && (
              <p className="text-xs text-gray-500 mt-2">{currentPage.numPanels} panels • {currentPage.comicStyle || 'manga'} style</p>
            )}
          </div>
        )}

        {/* Continue Button */}
        {!fullscreen && (
          <button
            onClick={() => setShowContinueModal(true)}
            className="mt-6 w-full max-w-3xl mx-auto block btn-primary py-3 text-lg"
          >
            ✨ Continue This Story
          </button>
        )}

        {/* Page Thumbnails (in page mode) */}
        {viewMode === 'page' && !fullscreen && completedPages.length > 1 && (
          <div className="mt-6 max-w-3xl mx-auto">
            <h3 className="font-semibold mb-3">All Pages</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {completedPages.map((page, idx) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden border-2 ${
                    idx === currentPageIndex ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <img
                    src={page.thumbnailUrl || page.imageUrl!}
                    alt={`Page ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pending Pages Info */}
        {!fullscreen && pendingPages.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg max-w-3xl mx-auto">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⏳ {pendingPages.length} page(s) are being generated...
            </p>
          </div>
        )}
      </div>

      {/* Continue Modal */}
      {showContinueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Continue the Story</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              What happens next? Describe the next scene and our AI will generate a new comic page.
            </p>
            <textarea
              value={continuePrompt}
              onChange={(e) => setContinuePrompt(e.target.value)}
              placeholder="The hero confronts the villain in an epic showdown, lightning crackling in the background..."
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
                {submitting ? 'Submitting...' : 'Generate Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
