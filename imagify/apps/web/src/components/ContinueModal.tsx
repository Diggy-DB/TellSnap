import React from 'react';

export default function ContinueModal(){
  return (
    <div className="fixed inset-0 flex items-end md:items-center justify-center p-4 pointer-events-none">
      <div className="w-full max-w-2xl bg-surface rounded-lg p-4 pointer-events-auto">
        <h3 className="font-semibold">Continue Scene</h3>
        <textarea className="w-full mt-3 p-2 rounded bg-black/40 h-28" placeholder="Write your continuation..." />
        <div className="mt-3 flex gap-2 justify-end">
          <button className="px-3 py-2 rounded border">Cancel</button>
          <button className="px-4 py-2 bg-gold rounded text-black">Submit</button>
        </div>
      </div>
    </div>
  )
}
