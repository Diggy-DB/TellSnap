'use client';

import { useState } from 'react';

export default function CreatePage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    // TODO: Connect to AI generation API
    setTimeout(() => {
      setIsGenerating(false);
      alert('Generation would start here! 🎬');
    }, 2000);
  };

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

        {/* Prompt Input */}
        <div className="bg-surface rounded-2xl p-6 md:p-8">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            What's your story? 📝
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A fierce samurai standing on a cliff, wind blowing through their hair, cherry blossoms falling around them, dramatic shading..."
            className="w-full h-48 bg-black/30 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan resize-none"
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
            disabled={!prompt.trim() || isGenerating}
            className={`w-full mt-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
              prompt.trim() && !isGenerating
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
