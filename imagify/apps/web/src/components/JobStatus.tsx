import React from 'react';

export default function JobStatus(){
  return (
    <div className="bg-surface rounded p-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-magenta to-cyan" />
        <div className="flex-1">
          <div className="text-sm font-medium">Generating segment</div>
          <div className="text-xs text-gray-400">~ 50% · step 2/4</div>
          <div className="mt-2 h-2 bg-black/30 rounded overflow-hidden">
            <div className="h-2 bg-magenta w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}