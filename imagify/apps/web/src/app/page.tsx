import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Imagify
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
          Create collaborative AI-generated video stories. Start a scene, 
          continue the narrative, and build amazing stories together.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link href="/explore" className="btn-primary text-lg px-8 py-3">
            Explore Stories
          </Link>
          <Link href="/create" className="btn-secondary text-lg px-8 py-3">
            Create Scene
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <FeatureCard
            title="🎬 AI Video Generation"
            description="Transform your ideas into stunning video segments with cutting-edge AI"
          />
          <FeatureCard
            title="🤝 Collaborative"
            description="Continue any scene - build on others' creativity or fork your own path"
          />
          <FeatureCard
            title="📖 Story Continuity"
            description="Smart Scene Bible keeps characters and plot consistent across segments"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="card text-left">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
