'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../src/lib/api';
import { useAuth } from '../../../src/lib/auth-context';

interface Segment {
  id: string;
  orderIndex: number;
  prompt: string;
  status: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  numPanels?: number;
  comicStyle?: string;
  createdAt: string;
}

interface Scene {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  status: string;
  segments: Segment[];
  topic?: { id: string; title: string };
  createdBy?: { id: string; username: string; avatarUrl?: string };
  createdAt: string;
}

export default function ScenePage() {
  const params = useParams();
  const sceneId = params.id as string;
  const { isAuthenticated } = useAuth();
  
  const [scene, setScene] = useState<Scene | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [continuePrompt, setContinuePrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchScene() {
      try {
        const data = await api.getScene(sceneId) as unknown as Scene;
        setScene(data);
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
      s => s.status === 'PENDING' || s.status === 'PROCESSING' || s.status === 'QUEUED'
    );
    
    if (!hasPendingSegments) return;
    
    const interval = setInterval(async () => {
      try {
        const data = await api.getScene(sceneId) as unknown as Scene;
        setScene(data);
        
        // Check if all segments are done
        const stillPending = data.segments.some(
          (s: Segment) => s.status === 'PENDING' || s.status === 'PROCESSING' || s.status === 'QUEUED'
        );
        if (!stillPending) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Failed to poll scene:', error);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [scene, sceneId]);

  const handleContinue = async () => {
    if (!continuePrompt.trim()) return;
    
    setSubmitting(true);
    try {
      const lastSegment = scene?.segments[scene.segments.length - 1];
      
      await api.continueScene(sceneId, {
        parentSegmentId: lastSegment?.id || '',
        prompt: continuePrompt,
      });

      setShowContinueModal(false);
      setContinuePrompt('');
      // Refresh scene data
      const data = await api.getScene(sceneId) as unknown as Scene;
      setScene(data);
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
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading your comic...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!scene) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto text-center py-16">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-4">Scene not found</h1>
          <Link href="/" className="px-6 py-3 bg-gradient-to-r from-magenta to-cyan text-white rounded-xl font-bold hover:scale-105 transition-transform inline-block">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const completedPanels = scene.segments.filter(s => s.status === 'COMPLETED' && s.imageUrl);
  const pendingPanels = scene.segments.filter(s => s.status !== 'COMPLETED');
  const currentPanel = completedPanels[currentPanelIndex];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-cyan hover:underline mb-2 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold">{scene.title}</h1>
          <p className="text-gray-400 mt-2">{scene.description}</p>
          {scene.createdBy && (
            <p className="text-sm text-gray-500 mt-2">
              Created by <span className="text-cyan">{scene.createdBy.username}</span>
            </p>
          )}
          {scene.topic && (
            <span className="inline-block mt-2 text-sm bg-cyan/20 text-cyan px-3 py-1 rounded-full">
              {scene.topic.title}
            </span>
          )}
        </div>

        {/* Status Banner */}
        {pendingPanels.length > 0 && (
          <div className="mb-6 bg-cyan/10 border border-cyan/50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-cyan font-medium">Generating panels...</p>
              <p className="text-sm text-gray-400">
                {completedPanels.length} of {scene.segments.length} panels complete
              </p>
            </div>
          </div>
        )}

        {/* Comic Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="relative bg-surface rounded-2xl overflow-hidden aspect-[3/4] flex items-center justify-center p-4">
              {currentPanel?.imageUrl ? (
                <img
                  src={currentPanel.imageUrl}
                  alt={`Panel ${currentPanelIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-4">🎨</div>
                  <p>{completedPanels.length === 0 ? 'Panels generating...' : 'No panel selected'}</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            {completedPanels.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setCurrentPanelIndex(Math.max(0, currentPanelIndex - 1))}
                  disabled={currentPanelIndex === 0}
                  className="px-4 py-2 bg-surface rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-gray-400">
                  Panel {currentPanelIndex + 1} of {completedPanels.length}
                </span>
                <button
                  onClick={() => setCurrentPanelIndex(Math.min(completedPanels.length - 1, currentPanelIndex + 1))}
                  disabled={currentPanelIndex >= completedPanels.length - 1}
                  className="px-4 py-2 bg-surface rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}

            {/* Panel Info */}
            {currentPanel && (
              <div className="mt-4 p-4 bg-surface rounded-xl">
                <h3 className="font-semibold mb-2">Panel {currentPanelIndex + 1}</h3>
                <p className="text-sm text-gray-400">{currentPanel.prompt}</p>
              </div>
            )}

            {/* Continue Button */}
            {isAuthenticated && completedPanels.length > 0 && (
              <button
                onClick={() => setShowContinueModal(true)}
                className="mt-4 w-full py-3 text-lg bg-gradient-to-r from-magenta to-cyan text-white rounded-xl font-bold hover:scale-[1.02] transition-transform"
              >
                ✨ Continue This Story
              </button>
            )}
          </div>

          {/* Panel Timeline */}
          <div className="lg:col-span-1">
            <h3 className="font-semibold mb-4">All Panels ({scene.segments.length})</h3>
            <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
              {scene.segments.map((segment, idx) => {
                const isCompleted = segment.status === 'COMPLETED' && segment.imageUrl;
                const completedIdx = completedPanels.findIndex(s => s.id === segment.id);
                const isCurrent = completedIdx === currentPanelIndex && isCompleted;
                
                return (
                  <button
                    key={segment.id}
                    onClick={() => {
                      if (isCompleted && completedIdx >= 0) {
                        setCurrentPanelIndex(completedIdx);
                      }
                    }}
                    disabled={!isCompleted}
                    className={`aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all ${
                      isCurrent
                        ? 'border-cyan shadow-lg shadow-cyan/20'
                        : isCompleted
                        ? 'border-transparent hover:border-gray-600'
                        : 'border-dashed border-gray-700 cursor-not-allowed'
                    }`}
                  >
                    {segment.imageUrl ? (
                      <img src={segment.imageUrl} alt={`Panel ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : segment.thumbnailUrl ? (
                      <img src={segment.thumbnailUrl} alt={`Panel ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface flex flex-col items-center justify-center text-gray-500">
                        {segment.status === 'COMPLETED' ? (
                          <span className="text-2xl">🎨</span>
                        ) : segment.status === 'PROCESSING' || segment.status === 'QUEUED' ? (
                          <>
                            <div className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mb-2" />
                            <span className="text-xs">Panel {idx + 1}</span>
                          </>
                        ) : (
                          <span className="text-xs">Panel {idx + 1}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {pendingPanels.length > 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                {pendingPanels.length} panel(s) generating...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Continue Modal */}
      {showContinueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-2xl p-6 max-w-lg w-full border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Continue the Story</h2>
            <p className="text-gray-400 mb-4">
              What happens next? Describe the next panel and our AI will generate it.
            </p>
            <textarea
              value={continuePrompt}
              onChange={(e) => setContinuePrompt(e.target.value)}
              placeholder="The hero unleashes their ultimate attack, energy crackling around them..."
              className="w-full h-32 p-3 bg-black/30 border border-gray-700 rounded-xl resize-none text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowContinueModal(false)}
                className="flex-1 py-3 bg-gray-700 rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={submitting || !continuePrompt.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-magenta to-cyan text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
              >
                {submitting ? 'Submitting...' : 'Generate Panel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
