import React from 'react';

export default function Player(){
  return (
    <div className="bg-gradient-to-b from-surface/60 to-transparent rounded-lg overflow-hidden">
      <div className="bg-black/80 aspect-video flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold">Scene: The Horizon</div>
          <div className="text-sm text-gray-300">Segment 6 • 00:45</div>
        </div>
      </div>
      <div className="p-3 flex items-center gap-3">
        <button className="px-4 py-2 bg-gold text-black rounded">Play</button>
        <button className="px-3 py-2 border border-gray-700 rounded text-sm">Download</button>
        <div className="ml-auto text-xs text-gray-400">HLS · 720p</div>
      </div>
    </div>
  );
}
