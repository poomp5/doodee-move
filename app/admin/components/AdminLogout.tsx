"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function AdminLogout() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
        <LogOut className="h-4 w-4" />
      </span>
      <span className="text-left">
        <span className="block text-sm font-semibold">Sign out</span>
        <span className="block text-xs text-gray-400">ออกจากระบบหลังบ้าน</span>
      </span>
    </button>
  );
}
