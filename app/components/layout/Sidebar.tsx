"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  GraduationCap,
  UsersRound,
  Shield,
  Briefcase,
  Building2,
  UserCog,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  FolderOpen,
} from "lucide-react";

import {
  useBranding,
} from "@/components/providers/BrandThemeProvider";


type MenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
};


const superAdminMenu: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Employees",
    href: "/dashboard/employees",
    icon: UsersRound,
  },
  {
    name: "Companies",
    href: "/dashboard/companies",
    icon: Building2,
  },
  {
    name: "Company Admins",
    href: "/dashboard/company-admins",
    icon: Shield,
  },
  {
    name: "Courses",
    href: "/dashboard/courses",
    icon: GraduationCap,
  },
  {
    name: "Files & Documents",
    href: "/dashboard/files",
    icon: FolderOpen,
  },
  {
    name: "AI Assistant",
    href: "/",
    icon: Bot,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    name: "Settings",
    href: "/dashboard/settings/",
    icon: Settings,
  },
];


const companyMenu: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Employees",
    href: "/dashboard/employees",
    icon: UsersRound,
  },
  {
    name: "Departments",
    href: "/dashboard/departments",
    icon: Briefcase,
  },
  {
    name: "Department Heads",
    href: "/dashboard/department-heads",
    icon: UserCog,
  },
  {
    name: "Courses",
    href: "/dashboard/courses",
    icon: GraduationCap,
  },
  {
    name: "Files & Documents",
    href: "/dashboard/files",
    icon: FolderOpen,
  },
  {
    name: "AI Assistant",
    href: "/",
    icon: Bot,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];


const departmentMenu: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Employees",
    href: "/dashboard/employees",
    icon: UsersRound,
  },
  {
    name: "Courses",
    href: "/dashboard/courses",
    icon: GraduationCap,
  },
  {
    name: "AI Assistant",
    href: "/",
    icon: Bot,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];


export default function Sidebar() {
  const pathname = usePathname();

  const { branding } = useBranding();

  const [menu, setMenu] =
    useState<MenuItem[]>([]);

  const [role, setRole] =
    useState("");

  const [userName, setUserName] =
    useState("User");

  const [companyName, setCompanyName] =
    useState("Organization");


  useEffect(() => {
    const storedRole =
      localStorage.getItem("role") || "";

    const storedName =
      localStorage.getItem("user_name") ||
      localStorage.getItem("name") ||
      "User";

    const storedCompany =
      localStorage.getItem("company_name") ||
      "Organization";


    setRole(storedRole);
    setUserName(storedName);
    setCompanyName(storedCompany);


    if (storedRole === "super_admin") {
      setMenu(superAdminMenu);
    } else if (storedRole === "company_admin") {
      setMenu(companyMenu);
    } else if (storedRole === "department_head") {
      setMenu(departmentMenu);
    } else {
      setMenu([]);
    }
  }, []);


  const getRoleLabel = () => {
    switch (role) {
      case "super_admin":
        return "Super Admin";

      case "company_admin":
        return "Company Admin";

      case "department_head":
        return "Department Head";

      case "employee":
        return "Employee";

      default:
        return "User";
    }
  };


  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();


  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    localStorage.removeItem("user_id");
    localStorage.removeItem("company_id");
    localStorage.removeItem("company_name");
    localStorage.removeItem("department_id");

    window.location.href = "/login";
  };

  const displayCompanyName =
    branding.company_name ||
    companyName ||
    "Learning Platform";
  return (
    <aside className="flex h-screen w-[236px] shrink-0 flex-col border-r border-slate-200 bg-white">

      {/* =====================================================
          LOGO
         ===================================================== */}

      <div className="flex h-[82px] items-center border-b border-slate-200 px-6">

        <Link
          href={
            role === "employee"
              ? "/learning/dashboard"
              : "/dashboard"
          }
          className="flex min-w-0 items-center gap-3"
        >

          {/* Company logo */}

          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            {branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt={`${displayCompanyName} logo`}
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <span
                className="text-xl font-black"
                style={{
                  color:
                    "var(--brand-primary)",
                }}
              >
                {displayCompanyName.charAt(0).toUpperCase() || "L"}
              </span>
            )}

          </div>


          {/* Brand name */}

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
              className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--brand-accent)",
              }}
            >
              LMS
            </div>

          </div>

        </Link>

      </div>


      {/* =====================================================
          NAVIGATION
         ===================================================== */}

      <nav className="flex-1 overflow-y-auto px-3 py-5">

        <div className="space-y-1">

          {menu.map((item) => {

            const Icon = item.icon;

            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href ||
                    pathname.startsWith(
                      `${item.href}/`
                    );


            return (
              <Link
                key={item.name}
                href={item.href}
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
                  className={
                    active
                      ? "text-[var(--brand-primary-text)]"
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


        {/* ===================================================
            QUICK ACTIONS
           =================================================== */}

        {role === "super_admin" && (

          <div className="mt-7">

            <div
              className="mb-3 px-4 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{
                color:
                  "var(--brand-accent)",
              }}
            >
              Quick Actions
            </div>


            <Link
              href="/dashboard/companies"
              className="mb-1 flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Building2 size={17} />
              Add Company
            </Link>


            <Link
              href="/dashboard/courses"
              className="mb-1 flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <GraduationCap size={17} />
              Manage Courses
            </Link>


            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Bot size={17} />
              Open Assistant
            </Link>

          </div>

        )}

      </nav>


      {/* =====================================================
          USER / COMPANY CARD
         ===================================================== */}

      <div className="border-t border-slate-200 p-3">

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">

          {/* Avatar */}

          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{
              backgroundColor:
                "var(--brand-primary)",

              color:
                "var(--brand-primary-text)",
            }}
          >
            {initials || "U"}
          </div>


          {/* User information */}

          <div className="min-w-0 flex-1">

            <p className="truncate text-[13px] font-semibold text-slate-900">
              {userName}
            </p>

            <p className="truncate text-[11px] text-slate-500">

              {role === "super_admin"
                ? "Super Administrator"
                : `${getRoleLabel()}${
                    companyName
                      ? ` • ${companyName}`
                      : ""
                  }`}

            </p>

          </div>


          {/* Logout */}

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={17} />
          </button>

        </div>

      </div>

    </aside>
  );
}