import Image from "next/image";
import { AdminNav } from "./components/AdminNav";
import { AdminLogout } from "./components/AdminLogout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f6f2] text-gray-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-gray-200/80 bg-white px-4 py-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-8">
            <Image src="/logo.png" width={34} height={34} alt="Doodee Move" className="rounded-xl" />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Doodee Move</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>

          <AdminNav />

          <div className="mt-auto pt-6">
            <AdminLogout />
          </div>
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-20 border-b border-gray-200/80 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-xs font-medium text-[#2E9C63] uppercase tracking-widest">Admin Panel</p>
                <h1 className="text-base font-semibold text-gray-900 mt-0.5">ระบบจัดการหลังบ้าน</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2E9C63]" />
                <span className="text-sm text-gray-500">Online</span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8">
            {/* Mobile nav */}
            <div className="lg:hidden rounded-2xl border border-gray-200 bg-white p-4 mb-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <Image src="/logo.png" width={30} height={30} alt="Doodee Move" className="rounded-xl" />
                <p className="text-sm font-bold text-gray-900">Doodee Move Admin</p>
              </div>
              <AdminNav />
              <div className="mt-4">
                <AdminLogout />
              </div>
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
