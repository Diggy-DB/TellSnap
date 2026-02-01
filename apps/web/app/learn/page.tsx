export default function LearnPage() {
  const steps = [
    {
      emoji: "✨",
      title: "Write Your Idea",
      description: "Start with a simple prompt describing your comic panel. Include characters, emotions, action, and style details.",
      example: '"A hero unleashing their ultimate attack"'
    },
    {
      emoji: "🎨",
      title: "Generate Your Panel",
      description: "Our AI transforms your words into stunning comic artwork. Watch as your imagination becomes professional-quality panels.",
      example: "Processing takes ~15 seconds"
    },
    {
      emoji: "✏️",
      title: "Edit & Refine",
      description: "Not quite right? Adjust the composition, change expressions, or regenerate until your panel is perfect.",
      example: "Unlimited revisions"
    },
    {
      emoji: "🚀",
      title: "Share with the World",
      description: "Export in high resolution or share directly to social media. Your comic deserves an audience!",
      example: "PNG • JPG • Share Link"
    }
  ];

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan via-magenta to-gold bg-clip-text text-transparent">
              How It Works
            </span>
          </h1>
          <p className="text-xl text-gray-400">
            From idea to comic in 4 simple steps ✨
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="bg-surface rounded-2xl p-6 md:p-8 hover:ring-2 ring-cyan/50 transition-all duration-300"
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-magenta/20 to-cyan/20 flex items-center justify-center text-3xl">
                    {step.emoji}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-cyan">STEP {index + 1}</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
                  <p className="text-gray-400 mb-3">{step.description}</p>
                  <div className="inline-block bg-black/30 rounded-lg px-4 py-2 text-sm text-gold font-medium">
                    {step.example}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-2xl font-semibold mb-6">Ready to create your first comic? 🎉</p>
          <a 
            href="/"
            className="inline-block px-8 py-4 bg-gradient-to-r from-magenta to-cyan text-white font-bold rounded-full text-lg hover:scale-105 transition-transform"
          >
            Get Started Now →
          </a>
        </div>
      </div>
    </div>
  );
}
