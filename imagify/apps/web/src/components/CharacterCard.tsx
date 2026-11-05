import React from 'react';

export default function CharacterCard({name='Maya Chen', role='Protagonist'}:{name?:string;role?:string}){
  return (
    <div className="bg-gradient-to-b from-black/20 to-transparent rounded-lg p-3 flex items-center gap-3">
      <div className="w-14 h-14 rounded-full bg-gray-600" />
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-gray-400">{role}</div>
        <div className="mt-2 flex gap-1 text-xs">
          <span className="px-2 py-1 bg-gray-800 rounded">determined</span>
          <span className="px-2 py-1 bg-gray-800 rounded">analytical</span>
        </div>
      </div>
    </div>
  )
}