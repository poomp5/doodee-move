import Link from "next/link";
import Image from "next/image";
import { AdminNav } from "./components/AdminNav";
import { AdminLogout } from "./components/AdminLogout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 flex flex-col z-30">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-100">
          <Image src="/logo.png" width={32} height={32} alt="Doodee Move" className="rounded-lg" />
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Doodee Move</p>
            <p className="text-xs text-gray-400">Admin Dashboard</p>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <AdminNav />
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <AdminLogout />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
