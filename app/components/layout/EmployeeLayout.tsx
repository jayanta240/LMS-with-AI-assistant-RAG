"use client";

import React from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  LayoutDashboard,
  BookOpen,
  Bot,
  UserCircle,
  LogOut,
  GraduationCap,
  Search,
  CalendarDays,
  Bell,
  Menu,
  X,
} from "lucide-react";

import {
  useBranding,
} from "@/components/providers/BrandThemeProvider";


export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { branding } =
    useBranding();

  const [userName, setUserName] =
    React.useState("Learner");

  const [companyName, setCompanyName] =
    React.useState("");

  const [mobileOpen, setMobileOpen] =
    React.useState(false);


  React.useEffect(() => {
    setUserName(
      localStorage.getItem(
        "user_name"
      ) ||
        localStorage.getItem(
          "name"
        ) ||
        "Learner"
    );

    setCompanyName(
      localStorage.getItem(
        "company_name"
      ) || ""
    );
  }, []);


  const displayCompanyName =
    branding.company_name ||
    companyName ||
    "Learning Platform";


  const logout = () => {
    const userId =
      localStorage.getItem("user_id");

    if (userId) {
      sessionStorage.removeItem(
        `employee_dashboard_${userId}`
      );
    }

    localStorage.clear();
    window.dispatchEvent(
      new Event("company-changed")
    );

    router.push("/login");
  };


  const menu = [
    {
      name: "Dashboard",
      href: "/learning/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "My Courses",
      href: "/learning",
      icon: BookOpen,
    },
    {
      name: "AI Assistant",
      href: "/assistant",
      icon: Bot,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: UserCircle,
    },
  ];


  const isActive = (
    href: string
  ) => {

    if (
      href ===
      "/learning/dashboard"
    ) {
      return (
        pathname ===
        "/learning/dashboard"
      );
    }


    if (href === "/learning") {
      return (
        pathname === "/learning" ||
        (
          pathname.startsWith(
            "/learning/"
          ) &&
          pathname !==
            "/learning/dashboard"
        )
      );
    }


    if (href === "/") {
      return pathname === "/";
    }


    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  };


  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) => part[0]
    )
    .join("")
    .toUpperCase();


  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">

      {/* =====================================================
          SIDEBAR
         ===================================================== */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[60] bg-slate-950/40 md:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 z-[70]
          flex h-dvh w-[236px] shrink-0 flex-col overflow-hidden
          border-r border-slate-200 bg-white
          shadow-xl transition-[left] duration-200
          md:static md:shadow-none
        `}
        style={{
          zIndex: 70,
          pointerEvents: "auto",
          left: mobileOpen ? 0 : "-236px",
        }}
      >

        {/* =================================================
            BRAND
           ================================================= */}

        <div className="flex h-[82px] items-center border-b border-slate-200 px-5">

          <Link
            href="/learning/dashboard"
            className="flex min-w-0 items-center gap-3"
          >

            {/* Company Logo */}

            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

              {branding.logo_url ? (

                <img
                  src={branding.logo_url}
                  alt={`${displayCompanyName} logo`}
                  className="h-full w-full object-contain p-1.5"
                />

              ) : (

                <span
                  className="text-[16px] font-black"
                  style={{
                    color:
                      "var(--brand-primary)",
                  }}
                >
                  {displayCompanyName
                    .charAt(0)
                    .toUpperCase() ||
                    "L"}
                </span>

              )}

            </div>


            {/* Company Name */}

            <div className="min-w-0 leading-none">

              <div
                className="truncate text-[18px] font-extrabold tracking-tight"
                style={{
                  color:
                    "var(--brand-secondary)",
                }}
              >
                {displayCompanyName}
              </div>


              <div
                className="mt-1 max-w-[150px] truncate text-[9px] font-semibold uppercase leading-tight tracking-[0.08em]"
                style={{
                  color:
                    "var(--brand-accent)",
                }}
              >
                Learning Portal
              </div>

            </div>

          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 md:hidden"
          >
            <X size={20} />
          </button>

        </div>


        {/* =================================================
            LEARNER PORTAL LABEL
           ================================================= */}

        <div className="px-5 pb-2 pt-5">

          <div
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--brand-accent)",
            }}
          >

            <GraduationCap size={14} />

            <span>
              Learner Portal
            </span>

          </div>

        </div>


        {/* =================================================
            NAVIGATION
           ================================================= */}

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">

          <div className="space-y-1">

            {menu.map((item) => {

              const Icon =
                item.icon;

              const active =
                isActive(
                  item.href
                );


              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={
                    active
                      ? {
                          backgroundColor:
                            "var(--brand-primary)",

                          color:
                            "var(--brand-primary-text)",
                        }
                      : undefined
                  }
                  className={`
                    group relative flex items-center gap-3
                    rounded-xl px-4 py-3
                    text-[14px] font-medium
                    transition-all duration-200
                    ${
                      active
                        ? "shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >

                  {/* Active indicator */}

                  {active && (

                    <span
                      className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full"
                      style={{
                        backgroundColor:
                          "var(--brand-accent)",
                      }}
                    />

                  )}


                  <Icon
                    size={19}
                    style={
                      active
                        ? {
                            color:
                              "var(--brand-primary-text)",
                          }
                        : undefined
                    }
                    className={
                      active
                        ? ""
                        : "text-slate-500 group-hover:text-slate-800"
                    }
                  />


                  <span>
                    {item.name}
                  </span>

                </Link>
              );
            })}

          </div>

        </nav>


        {/* =================================================
            USER CARD
           ================================================= */}

        <div className="shrink-0 border-t border-slate-200 p-3">

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">

            {/* User avatar */}

            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{
                backgroundColor:
                  "var(--brand-primary)",

                color:
                  "var(--brand-primary-text)",
              }}
            >
              {initials || "L"}
            </div>


            {/* User information */}

            <div className="min-w-0 flex-1">

              <p className="truncate text-[13px] font-semibold text-slate-900">
                {userName}
              </p>


              <p className="truncate text-[11px] text-slate-500">
                Learner
                {displayCompanyName
                  ? ` • ${displayCompanyName}`
                  : ""}
              </p>

            </div>


            {/* Logout */}

            <button
              type="button"
              onClick={logout}
              title="Logout"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={17} />
            </button>

          </div>

        </div>

      </aside>


      {/* =====================================================
          MAIN AREA
         ===================================================== */}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* =================================================
            TOP HEADER
           ================================================= */}

        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:h-[78px] sm:px-6 lg:px-8">

          {/* Search */}

          <div className="flex min-w-0 flex-1 items-center gap-3">

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-50 md:hidden"
            >
              <Menu size={22} />
            </button>

            <div className="flex h-10 min-w-0 flex-1 items-center rounded-xl border border-slate-200 bg-white px-3 text-slate-400 sm:w-[390px] sm:flex-none">

              <Search size={18} />

              <span className="ml-3 truncate text-sm text-slate-400">
                Search anything...
              </span>

              <span className="ml-auto hidden rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500 sm:block">
                Ctrl + K
              </span>

            </div>

          </div>


          {/* Header actions */}

          <div className="ml-2 flex shrink-0 items-center gap-1 sm:gap-4">

            <button
              type="button"
              className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-50"
              title="Calendar"
            >
              <CalendarDays size={19} />
            </button>


            <button
              type="button"
              className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-50"
              title="Notifications"
            >

              <Bell size={19} />

              <span
                className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                style={{
                  backgroundColor:
                    "var(--brand-accent)",

                  color:
                    "var(--brand-secondary)",
                }}
              >
                0
              </span>

            </button>


            {/* Header user */}

            <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:gap-3 sm:pl-4">

              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                style={{
                  backgroundColor:
                    "var(--brand-primary)",

                  color:
                    "var(--brand-primary-text)",
                }}
              >
                {initials || "L"}
              </div>


              <div className="hidden min-w-0 lg:block">

                <p className="max-w-[140px] truncate text-[13px] font-semibold text-slate-900">
                  {userName}
                </p>


                <p className="max-w-[140px] truncate text-[11px] text-slate-500">
                  {displayCompanyName}
                </p>

              </div>

            </div>

          </div>

        </header>


        {/* =================================================
            PAGE CONTENT
           ================================================= */}

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">

          <div className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">

            {children}

          </div>

        </main>

      </div>

    </div>
  );
}