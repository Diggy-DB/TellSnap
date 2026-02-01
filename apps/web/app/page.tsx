import SceneTimeline from '../src/components/SceneTimeline';

export default function Page() {
  return (
    <div className="space-y-8">
      <section className="hero">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-magenta via-cyan to-gold bg-clip-text text-transparent">Create your own comic</span>
              </h1>
              <p className="lead mt-4">Transform your ideas into stunning comic panels with AI. High-quality artwork, dynamic compositions, and professional styling in seconds.</p>
              <div className="mt-6 flex gap-3">
                <a className="px-4 py-2 bg-gold text-black rounded font-medium hover:bg-yellow-400 transition-colors" href="/create">Get started</a>
                <a className="px-4 py-2 border rounded text-gray-300 hover:bg-white/10 transition-colors" href="/learn">Learn more</a>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-gradient-to-br from-surface/60 to-transparent rounded-lg p-6 flex items-center justify-center">
                <div className="text-9xl">📖</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4">
        <SceneTimeline />
      </section>
    </div>
  );
}
