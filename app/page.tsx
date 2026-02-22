import Link from "next/link";

export default function HomePage() {
  return (
    <main className="scroll-smooth bg-white text-gray-900">
      {/* ================= HERO ================= */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 overflow-hidden">
        {/* Glow background */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl"></div>

        <div className="relative container mx-auto px-6 md:px-12 text-white">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
              Doodee Move
            </h1>

            <p className="mt-6 text-xl md:text-2xl text-white/90">
              Smart choices. Fewer footprints.
              <br />
              Sustainable transportation made simple.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="https://lin.ee/WFiJHBK"
                target="_blank"
                className="bg-white text-emerald-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-xl hover:scale-105 transition"
              >
                Get Started
              </Link>

              <a
                href="#features"
                className="border border-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-emerald-600 transition"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Why Doodee Move?</h2>

          <p className="text-gray-600 max-w-2xl mx-auto mb-16">
            We optimize school and community transportation to reduce
            congestion, emissions, and wasted time.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
              <div className="text-emerald-600 text-3xl mb-4">🌱</div>
              <h3 className="font-semibold text-xl mb-2">Reduce CO₂</h3>
              <p className="text-gray-600">
                Minimize carbon emissions through smart routing and shared
                mobility.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
              <div className="text-emerald-600 text-3xl mb-4">🚦</div>
              <h3 className="font-semibold text-xl mb-2">Less Congestion</h3>
              <p className="text-gray-600">
                Cut peak-hour traffic and optimize daily transportation flow.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
              <div className="text-emerald-600 text-3xl mb-4">📊</div>
              <h3 className="font-semibold text-xl mb-2">Data Driven</h3>
              <p className="text-gray-600">
                Real-time insights and analytics for smarter decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= IMPACT ================= */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <h2 className="text-4xl font-bold mb-16">Measurable Impact</h2>

          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <h3 className="text-5xl font-extrabold text-emerald-600">67%</h3>
              <p className="mt-3 text-gray-600">Peak-hour congestion reduced</p>
            </div>

            <div>
              <h3 className="text-5xl font-extrabold text-emerald-600">135t</h3>
              <p className="mt-3 text-gray-600">CO₂ reduced annually</p>
            </div>

            <div>
              <h3 className="text-5xl font-extrabold text-emerald-600">
                99.8%
              </h3>
              <p className="mt-3 text-gray-600">System reliability</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="py-24 bg-gradient-to-r from-emerald-600 to-green-500 text-white text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Move Smarter?</h2>

        <Link
          href="https://lin.ee/WFiJHBK"
          target="_blank"
          className="inline-block bg-white text-emerald-600 px-10 py-4 rounded-xl font-semibold text-lg shadow-xl hover:scale-105 transition"
        >
          Start with LINE
        </Link>
      </section>
    </main>
  );
}
