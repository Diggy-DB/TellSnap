"use client";
import React, { useEffect, useState } from 'react';
import { applyTheme } from '../lib/theme';

export default function ThemeSwitch(){
  const [mode, setMode] = useState<'movie'|'anime'>('movie');

  useEffect(()=>{ applyTheme(mode); }, [mode]);

  return (
    <div className="flex items-center gap-2">
      <button onClick={()=>setMode('movie')} className={`px-3 py-1 rounded ${mode==='movie' ? 'bg-gold text-black' : 'bg-black/30'}`}>Movie</button>
      <button onClick={()=>setMode('anime')} className={`px-3 py-1 rounded ${mode==='anime' ? 'bg-magenta text-black' : 'bg-black/30'}`}>Anime</button>
    </div>
  )
}