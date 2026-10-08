"use client";

import {
  Bell,
  CalendarDays,
  SlidersHorizontal,
  Menu,
} from "lucide-react";

import { useEffect, useState } from "react";

import { useBranding } from "@/components/providers/BrandThemeProvider";
import GlobalSearch from "./GlobalSearch";

export default function Header({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const { branding } = useBranding();

  const [role, setRole] =
    useState("User");

  const [userName, setUserName] =
    useState("User");

  const [companyName, setCompanyName] =
    useState("");


  useEffect(() => {
    const storedRole =
      localStorage.getItem("role") || "";

    const storedName =
      localStorage.getItem("user_name") ||
      localStorage.getItem("name") ||
      "User";

    const storedCompany =
      localStorage.getItem("company_name") ||
      "";

    setUserName(storedName);
    setCompanyName(storedCompany);

    switch (storedRole) {
      case "super_admin":
        setRole("Super Admin");
        break;

      case "company_admin":
        setRole("Company Admin");
        break;

      case "department_head":
        setRole("Department Head");
        break;

      case "employee":
        setRole("Employee");
        break;

      default:
        setRole("User");
    }
  }, []);


  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();


  return (
    <header className="flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-3 sm:h-[82px] sm:px-6 lg:px-8">

      {/* =====================================================
          LEFT
         ===================================================== */}

      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-50 md:hidden"
        >
          <Menu size={22} />
        </button>

        <GlobalSearch />

      </div>


      {/* =====================================================
          RIGHT
         ===================================================== */}

      <div className="ml-2 flex shrink-0 items-center gap-1 sm:gap-4">

        {/* Calendar */}

        <button
          type="button"
          className="
            hidden
            rounded-xl
            p-2.5
            text-slate-500
            transition
            hover:bg-slate-50
            hover:text-slate-900
          "
          title="Calendar"
        >
          <CalendarDays size={20} />
        </button>


        {/* Notifications */}

        <button
          type="button"
          className="
            relative
            rounded-xl
            p-2.5
            text-slate-500
            transition
            hover:bg-slate-50
            hover:text-slate-900
          "
          title="Notifications"
        >

          <Bell size={21} />

          <span
            className="
              absolute
              -right-0.5
              -top-0.5
              flex
              h-5
              min-w-5
              items-center
              justify-center
              rounded-full
              px-1
              text-[10px]
              font-bold
            "
            style={{
              backgroundColor:
                "var(--brand-accent)",
              color:
                "var(--brand-secondary)",
            }}
          >
            8
          </span>

        </button>


        {/* Filters */}

        <button
          type="button"
          className="
            hidden
            items-center
            gap-2
            rounded-xl
            border
            border-slate-200
            px-4
            py-2.5
            text-sm
            font-medium
            text-slate-600
            transition
            hover:bg-slate-50
            lg:flex
          "
        >

          <SlidersHorizontal size={16} />

          Filters

        </button>


        {/* User */}

        <div className="ml-1 flex items-center gap-2 sm:ml-2 sm:gap-3">

          {/* Avatar */}

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              text-sm
              font-bold
            "
            style={{
              backgroundColor:
                "var(--brand-primary)",
              color:
                "var(--brand-primary-text)",
              borderColor:
                "var(--brand-accent)",
            }}
          >
            {initials || "U"}
          </div>


          {/* User information */}

          <div className="hidden leading-tight lg:block">

            <p className="text-sm font-semibold text-slate-900">
              {userName}
            </p>

            <p className="text-[12px] text-slate-500">
              {role}
              {companyName
                ? ` • ${companyName}`
                : ""}
            </p>

          </div>


          {/* Account menu */}

          <button
            type="button"
            className="ml-1 hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 sm:block"
            title="Account menu"
          >
            <span className="text-xs">
              ⌄
            </span>
          </button>

        </div>

      </div>

    </header>
  );
}