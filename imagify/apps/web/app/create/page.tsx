'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth-context';
import { api } from '../../src/lib/api';
import Link from 'next/link';

export default function CreatePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 20) {
      setError('Please provide a more detailed description (at least 20 characters)');
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      // Create scene via API
      const result = await api.createScene({
        title: title || prompt.slice(0, 50) + '...',
        description: prompt,
        initialPrompt: prompt,
        topicId: undefined,
      });

      setJobId(result.job.id);

      // Poll for job status
      const pollJob = async () => {
        try {
          const job = await api.getJob(result.job.id);
          setProgress(job.progress || 0);

          if (job.status === 'completed' || job.status === 'COMPLETED') {
            setIsGenerating(false);
            // Navigate to the scene
            router.push(`/scene/${result.scene.id}`);
          } else if (job.status === 'failed' || job.status === 'FAILED') {
            setError('Generation failed. Please try again.');
            setIsGenerating(false);
          } else {
            // Continue polling
            setTimeout(pollJob, 2000);
          }
        } catch {
          setError('Failed to check generation status');
          setIsGenerating(false);
        }
      };

      // Start polling after a short delay
      setTimeout(pollJob, 1000);
    } catch (err) {
      console.error('Create scene error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create scene');
      setIsGenerating(false);
    }
  };

  // Show login prompt if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-magenta via-cyan to-gold bg-clip-text text-transparent">
              Create Your Story
            </span>
          </h1>
          <p className="text-gray-400 mb-8">
            Please sign in to start creating your comic
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-gradient-to-r from-magenta to-cyan text-white rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Sign In to Create
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-magenta via-cyan to-gold bg-clip-text text-transparent">
              Create Your Story
            </span>
          </h1>
          <p className="text-lg text-gray-400">
            Describe your scene and watch it become art ✨
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Progress Indicator */}
        {isGenerating && jobId && (
          <div className="mb-6 bg-cyan/10 border border-cyan/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan font-medium">Generating your comic...</span>
              <span className="text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-magenta to-cyan h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">
              This may take a minute. We&apos;re creating your manga panels...
            </p>
          </div>
        )}

        {/* Form */}
        <div className="bg-surface rounded-2xl p-6 md:p-8">
          {/* Title Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Epic Adventure"
              disabled={isGenerating}
              className="w-full bg-black/30 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan disabled:opacity-50"
            />
          </div>

          <label className="block text-sm font-medium text-gray-300 mb-3">
            What&apos;s your story? 📝
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A fierce samurai standing on a cliff, wind blowing through their hair, cherry blossoms falling around them, dramatic shading..."
            disabled={isGenerating}
            className="w-full h-48 bg-black/30 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan resize-none disabled:opacity-50"
          />
          
          {/* Character count */}
          <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
            <span>{prompt.length} characters</span>
            <span>Be descriptive for better results!</span>
          </div>

          {/* Example prompts */}
          <div className="mt-6">
            <p className="text-sm text-gray-400 mb-2">Need inspiration? Try these:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Hero powering up with electric aura",
                "Magical girl transformation sequence",
                "Epic battle scene with speed lines",
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(example)}
                  className="px-3 py-1 bg-black/30 border border-gray-700 rounded-full text-sm text-gray-300 hover:border-cyan hover:text-cyan transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || prompt.length < 20 || isGenerating}
            className={`w-full mt-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
              prompt.trim() && prompt.length >= 20 && !isGenerating
                ? 'bg-gradient-to-r from-magenta to-cyan text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan/20'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating your comic...
              </span>
            ) : (
              '🎨 Generate Comic'
            )}
          </button>
        </div>

        {/* Tips */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>💡 Tip: Include details about art style, expressions, and panel composition for best results</p>
        </div>
      </div>
    </div>
  );
}
