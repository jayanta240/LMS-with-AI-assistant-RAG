"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">

      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        <div className="shrink-0">
          <Header
            onMenuClick={() => setMobileOpen(true)}
          />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">

          <div className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            {children}
          </div>

        </main>

      </div>

    </div>
  );
}