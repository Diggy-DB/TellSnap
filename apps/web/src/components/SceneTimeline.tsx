import React from 'react';

const categories = [
  { 
    name: "Action", 
    image: "/images/aot.jpg",
    color: "from-red-600 to-orange-500"
  },
  { 
    name: "Romance", 
    image: "/images/romance.jpg",
    color: "from-pink-500 to-rose-400"
  },
  { 
    name: "Comedy", 
    image: "/images/comedy.jpg",
    color: "from-yellow-500 to-amber-400"
  },
  { 
    name: "Thriller", 
    image: "/images/ds.jpg",
    color: "from-purple-700 to-indigo-600"
  },
  { 
    name: "Slice of Life", 
    image: "/images/slice of life.jpg",
    color: "from-green-500 to-teal-400"
  },
  { 
    name: "Fantasy", 
    image: "/images/one piece.jpg",
    color: "from-blue-600 to-cyan-400"
  },
];

export default function SceneTimeline(){
  return (
    <div className="bg-surface rounded-lg p-6">
      {/* Title */}
      <div className="text-center mb-8">
        <h3 className="text-3xl font-bold bg-gradient-to-r from-magenta via-cyan to-gold bg-clip-text text-transparent">
          Sample Comics
        </h3>
        <p className="text-gray-400 mt-2">Choose a genre to explore</p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((cat) => (
          <div 
            key={cat.name}
            className="group cursor-pointer"
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
              {/* Background Image */}
              <img 
                src={cat.image} 
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${cat.color} opacity-60 group-hover:opacity-40 transition-opacity`} />
              {/* Category Name */}
              <div className="absolute inset-0 flex items-end p-3">
                <span className="text-white font-bold text-lg drop-shadow-lg">{cat.name}</span>
              </div>
              {/* Hover Ring */}
              <div className="absolute inset-0 ring-2 ring-transparent group-hover:ring-cyan rounded-xl transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
