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
    <div className="flex h-dvh overflow-hidden bg-[#f5f7fb]">

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

          <div className="mx-auto w-full max-w-[1720px] px-4 py-5 sm:px-6 sm:py-7 lg:px-9 lg:py-8">
            {children}
          </div>

        </main>

      </div>

    </div>
  );
}