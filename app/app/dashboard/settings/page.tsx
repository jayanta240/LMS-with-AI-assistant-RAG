"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Palette,
  ChevronRight,
  ShieldCheck,
  Bot,
  UsersRound,
  Settings2,
  Bell,
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";

export default function SettingsPage() {
  const [role, setRole] = useState("");

  useEffect(() => {
    setRole(
      localStorage.getItem("role") || ""
    );
  }, []);

  const isCompanyAdmin =
    role === "company_admin";

  const isSuperAdmin =
    role === "super_admin";

  const isDepartmentHead =
    role === "department_head";

  return (
    <DashboardLayout>

      <div className="space-y-6">

        {/* =====================================================
            HEADER
           ===================================================== */}

        <div>

          <p
            className="text-sm font-semibold"
            style={{
              color:
                "var(--brand-accent)",
            }}
          >
            Configuration
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage settings available to your role and organization.
          </p>

        </div>


        {/* =====================================================
            COMPANY ADMIN
           ===================================================== */}

        {isCompanyAdmin && (

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {/* Branding */}

            <Link
              href="/dashboard/settings/branding"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >

              <div className="flex items-start justify-between">

                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--brand-primary) 10%, white)",
                    color:
                      "var(--brand-primary)",
                  }}
                >
                  <Palette size={22} />
                </div>

                <ChevronRight
                  size={19}
                  className="text-slate-300 transition group-hover:text-slate-500"
                />

              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                Company Branding
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Upload your company logo and customize the colors used
                throughout the LMS.
              </p>

              <div className="mt-5 text-sm font-semibold">
                <span
                  style={{
                    color:
                      "var(--brand-primary)",
                  }}
                >
                  Manage Branding →
                </span>
              </div>

            </Link>


            {/* Email Notifications */}

            <Link
              href="/dashboard/settings/notifications"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >

              <div className="flex items-start justify-between">

                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--brand-primary) 10%, white)",
                    color:
                      "var(--brand-primary)",
                  }}
                >
                  <Bell size={22} />
                </div>

                <ChevronRight
                  size={19}
                  className="text-slate-300 transition group-hover:text-slate-500"
                />

              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                Email Notifications
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Control course assignment and certificate emails sent to employees.
              </p>

              <div className="mt-5 text-sm font-semibold">
                <span
                  style={{
                    color:
                      "var(--brand-primary)",
                  }}
                >
                  Manage Notifications →
                </span>
              </div>

            </Link>


            {/* Security */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--brand-accent) 10%, white)",
                  color:
                    "var(--brand-accent)",
                }}
              >
                <ShieldCheck size={22} />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                Security
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Manage authentication and organization security preferences.
              </p>

              <p className="mt-5 text-xs font-medium text-slate-400">
                Coming soon
              </p>

            </div>


            {/* AI Assistant */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--brand-secondary) 8%, white)",
                  color:
                    "var(--brand-secondary)",
                }}
              >
                <Bot size={22} />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                AI Assistant
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Manage assistant-related organization preferences and
                configuration.
              </p>

              <p className="mt-5 text-xs font-medium text-slate-400">
                Coming soon
              </p>

            </div>

          </div>

        )}


        {/* =====================================================
            SUPER ADMIN
           ===================================================== */}

        {isSuperAdmin && (

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {/* Platform Settings */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--brand-primary) 10%, white)",
                  color:
                    "var(--brand-primary)",
                }}
              >
                <Settings2 size={22} />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                Platform Settings
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Configure global LMS behavior and platform preferences.
              </p>

              <p className="mt-5 text-xs font-medium text-slate-400">
                Coming soon
              </p>

            </div>


            {/* Companies */}

            <Link
              href="/dashboard/companies"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >

              <div className="flex items-start justify-between">

                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--brand-accent) 10%, white)",
                    color:
                      "var(--brand-accent)",
                  }}
                >
                  <UsersRound size={22} />
                </div>

                <ChevronRight
                  size={19}
                  className="text-slate-300 transition group-hover:text-slate-500"
                />

              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                Manage Companies
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Create, manage, and administer organizations using the platform.
              </p>

              <div className="mt-5 text-sm font-semibold">
                <span
                  style={{
                    color:
                      "var(--brand-primary)",
                  }}
                >
                  Open Companies →
                </span>
              </div>

            </Link>


            {/* AI Assistant */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--brand-secondary) 8%, white)",
                  color:
                    "var(--brand-secondary)",
                }}
              >
                <Bot size={22} />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                AI Platform
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Manage platform-level AI configuration and service settings.
              </p>

              <p className="mt-5 text-xs font-medium text-slate-400">
                Coming soon
              </p>

            </div>

          </div>

        )}


        {/* =====================================================
            DEPARTMENT HEAD
           ===================================================== */}

        {isDepartmentHead && (

          <div className="grid gap-5 md:grid-cols-2">

            {/* Team settings */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--brand-primary) 10%, white)",
                  color:
                    "var(--brand-primary)",
                }}
              >
                <UsersRound size={22} />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                Team Settings
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Manage settings related to your department and team.
              </p>

              <p className="mt-5 text-xs font-medium text-slate-400">
                Coming soon
              </p>

            </div>


            {/* AI Assistant */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--brand-secondary) 8%, white)",
                  color:
                    "var(--brand-secondary)",
                }}
              >
                <Bot size={22} />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-900">
                AI Assistant
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Access AI assistant preferences available to your department.
              </p>

              <p className="mt-5 text-xs font-medium text-slate-400">
                Coming soon
              </p>

            </div>

          </div>

        )}


        {/* =====================================================
            FALLBACK
           ===================================================== */}

        {!isCompanyAdmin &&
          !isSuperAdmin &&
          !isDepartmentHead && (

          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

            <h2 className="text-lg font-semibold text-slate-900">
              Settings unavailable
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Your account does not have access to organization settings.
            </p>

          </div>

        )}

      </div>

    </DashboardLayout>
  );
}