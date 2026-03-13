import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Leaf, TrendingUp, Users, ChevronRight, ArrowRight, Mail } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Smart Route Finding",
    description: "Find the most eco-friendly route to your destination with real-time transit data.",
  },
  {
    icon: Leaf,
    title: "CO2 Tracking",
    description: "Track your carbon savings every trip and see your cumulative impact grow.",
  },
  {
    icon: TrendingUp,
    title: "Points & Rewards",
    description: "Earn points for every sustainable choice and climb the leaderboard.",
  },
  {
    icon: Users,
    title: "Community Map",
    description: "Contribute and discover transit stops crowdsourced by the Doodee community.",
  },
];

const stats = [
  { value: "6+", label: "Transport Modes" },
  { value: "0g", label: "CO2 from Walking" },
  { value: "24/7", label: "Bot Available" },
  { value: "Free", label: "Always" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" width={32} height={32} alt="Doodee Move" className="rounded-lg" />
            <span className="font-bold text-gray-900">Doodee Move</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              prefetch={true}
            >
              Admin
            </Link>
            <Link href="https://lin.ee/WFiJHBK" target="_blank">
              <Button size="sm" className="bg-[#2E9C63] hover:bg-[#268a56] text-white rounded-full px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="mb-6 bg-green-50 text-[#2E9C63] border-green-100 rounded-full px-4 py-1 text-sm font-medium"
          >
            Sustainable Mobility for Everyone
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 leading-tight">
            Move smarter.
            <br />
            <span className="text-[#2E9C63]">Save the planet.</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Doodee Move helps you find eco-friendly routes, track your CO2 savings, and earn rewards - all through LINE.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="https://lin.ee/WFiJHBK" target="_blank">
              <Button
                size="lg"
                className="bg-[#2E9C63] hover:bg-[#268a56] text-white rounded-full px-8 h-14 text-base font-semibold shadow-lg shadow-green-200 hover:shadow-green-300 transition-all"
              >
                Add Friend on LINE
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full px-8 h-14 text-base text-gray-600 hover:text-gray-900"
              >
                Learn more
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="relative bg-linear-to-br from-[#2E9C63] to-[#1a7a4a] rounded-3xl overflow-hidden shadow-2xl shadow-green-200 p-12 flex flex-col items-center justify-center min-h-80">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.1),transparent_60%)]" />
            <Image
              src="/logo.png"
              width={120}
              height={120}
              alt="Doodee Move"
              className="relative z-10 drop-shadow-2xl"
            />
            <p className="relative z-10 mt-6 text-white/90 text-xl font-medium text-center">
              Smart choices. Fewer footprints.
            </p>
            <p className="relative z-10 mt-2 text-white/60 text-sm text-center">
              Sustainable mobility, reimagined.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#2E9C63]">{s.value}</div>
              <div className="mt-1 text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Everything you need to move green</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              From route planning to carbon tracking, Doodee Move has every tool for sustainable commuting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-8 rounded-2xl border border-gray-100 hover:border-green-100 hover:bg-green-50/30 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-5 group-hover:bg-[#2E9C63] transition-colors">
                  <f.icon className="w-5 h-5 text-[#2E9C63] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900">{f.title}</h3>
                <p className="mt-2 text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-linear-to-br from-[#2E9C63] to-[#1a7a4a]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Start your green journey today</h2>
          <p className="mt-4 text-white/80 text-lg">
            Add Doodee Move on LINE and start earning points for every eco-friendly trip.
          </p>
          <div className="mt-10">
            <Link href="https://lin.ee/WFiJHBK" target="_blank">
              <Button
                size="lg"
                className="bg-white text-[#2E9C63] hover:bg-gray-50 rounded-full px-10 h-14 text-base font-semibold shadow-xl"
              >
                Add Friend on LINE
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" width={24} height={24} alt="Doodee Move" className="rounded opacity-80" />
            <span className="text-sm font-medium text-gray-300">Doodee Move</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="https://lin.ee/WFiJHBK" target="_blank" className="hover:text-white transition-colors">LINE Bot</Link>
            <a
              href="mailto:contact@doodee-future.com"
              className="flex items-center gap-1.5 hover:text-white transition-colors group"
            >
              <Mail className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              contact@doodee-future.com
            </a>
          </div>
          <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Doodee Move. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
