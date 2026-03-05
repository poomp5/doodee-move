"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { LayoutDashboard, Route, MapPin, Leaf } from "lucide-react";

interface DashboardSidebarProps {
  pendingSubmissions: number;
  totalCo2Saved: number;
}

export default function DashboardSidebar({ pendingSubmissions, totalCo2Saved }: DashboardSidebarProps) {
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["overview", "trips", "approvals"];
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // If at very top, show overview
      if (scrollPosition < 50) {
        setActiveSection("overview");
        return;
      }

      // If near bottom of page (within 100px), highlight last section
      if (scrollPosition + windowHeight >= documentHeight - 100) {
        setActiveSection("approvals");
        return;
      }

      // Check each section from bottom to top (reverse order)
      // This ensures the last visible section is highlighted
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          
          // If this section is in view (accounting for sidebar)
          if (scrollPosition >= offsetTop - 100) {
            setActiveSection(section);
            return;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (sectionId === "overview") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetPosition = element.offsetTop - 20; // 20px offset for better positioning
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 fixed h-full">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <Image 
            src="/logo.png" 
            alt="Doodee Move Logo" 
            width={40} 
            height={40}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Doodee Move</h1>
            <p className="text-xs text-gray-500">Admin Dashboard</p>
          </div>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => scrollToSection("overview")}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition ${
              activeSection === "overview"
                ? "text-white bg-green-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => scrollToSection("trips")}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition ${
              activeSection === "trips"
                ? "text-white bg-green-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Route className="w-4 h-4" />
            Recent Trips
          </button>
          <button
            onClick={() => scrollToSection("approvals")}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition ${
              activeSection === "approvals"
                ? "text-white bg-green-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <MapPin className="w-4 h-4" />
            Transit Approvals
            {pendingSubmissions > 0 && (
              <span className="ml-auto bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {pendingSubmissions}
              </span>
            )}
          </button>
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Leaf className="w-4 h-4 text-green-600" />
          <div>
            <p className="font-medium text-gray-900">Eco Impact</p>
            <p>{(totalCo2Saved / 1000).toFixed(1)} kg CO₂ saved</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
