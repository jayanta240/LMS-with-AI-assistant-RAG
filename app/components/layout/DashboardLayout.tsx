"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">

      {/* =====================================================
          SIDEBAR
         ===================================================== */}

      <div className="shrink-0">
        <Sidebar />
      </div>

      {/* =====================================================
          MAIN APPLICATION AREA
         ===================================================== */}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}

        <div className="shrink-0">
          <Header />
        </div>

        {/* ===================================================
            PAGE CONTENT
           =================================================== */}

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">

          <div className="w-full px-6 py-6 lg:px-8 lg:py-7">

            {children}

          </div>

        </main>

      </div>

    </div>
  );
}