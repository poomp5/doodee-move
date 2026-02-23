import Link from "next/link";
import Image from "next/image";
export default function Home() {
  return (
    <main className="min-h-screen bg-[#2E9C63] flex items-center justify-center relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl animate-pulse"></div>

      <div className="relative text-center text-white px-6">
        {/* Floating Logo */}
        <div className="mb-8 flex justify-center">
          <Image src={'/logo.png'} width={200} height={200} alt="logo"  className="hover:transition-all duration-200 hover:-translate-y-1.5"/>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-fadeUp">
          Doodee Move
        </h1>

        {/* Tagline */}
        <p className="mt-6 text-lg md:text-xl text-white/90 max-w-xl mx-auto animate-fadeUp delay-200">
          Smart choices. Fewer footprints.
          <br />
          Sustainable mobility, reimagined.
        </p>

        {/* CTA */}
        <div className="mt-10 animate-fadeUp delay-300">
          <Link
            href="https://lin.ee/WFiJHBK"
            target="_blank"
            className="inline-block bg-white text-[#2E9C63] px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:scale-105 hover:shadow-xl transition duration-300"
          >
            Add Friend
          </Link>
        </div>
      </div>
    </main>
  );
}
