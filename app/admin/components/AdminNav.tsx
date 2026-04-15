"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Route, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    description: "ภาพรวมระบบทั้งหมด",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/trips",
    label: "Recent Trips",
    description: "ค้นหาและดูข้อมูลการเดินทาง",
    icon: Route,
  },
  {
    href: "/admin/submissions",
    label: "Submissions",
    description: "ตรวจสอบรายการรออนุมัติ",
    icon: MapPin,
  },
  {
    href: "/admin/ratings",
    label: "Feedback",
    description: "ดูคะแนนและข้อความจาก LINE",
    icon: Star,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Menu
      </p>
      {navItems.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={cn(
              "group flex items-start gap-3 rounded-2xl border px-3 py-3 transition-all",
              active
                ? "border-[#2E9C63]/20 bg-[#2E9C63]/8 text-gray-900 shadow-sm"
                : "border-transparent text-gray-600 hover:border-gray-200 hover:bg-white hover:text-gray-900"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border transition-colors",
                active
                  ? "border-[#2E9C63]/15 bg-[#2E9C63] text-white"
                  : "border-gray-200 bg-gray-50 text-gray-500 group-hover:border-gray-300 group-hover:bg-white"
              )}
            >
              <item.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className={cn("text-sm font-semibold", active ? "text-gray-950" : "text-gray-800")}>
                {item.label}
              </p>
              <p className={cn("text-xs leading-5", active ? "text-gray-600" : "text-gray-500")}>
                {item.description}
              </p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
