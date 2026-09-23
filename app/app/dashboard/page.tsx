"use client";

import { useEffect, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  Building2,
  Users,
  UserCheck,
  GraduationCap,
  Clock3,
  TrendingUp,
  Award,
  Bot,
  Activity,
  Database,
  HardDrive,
  Server,
  ShieldCheck,
  FileText,
  FolderOpen,
  ChevronRight,
} from "lucide-react";

import { getDashboardStats } from "@/lib/course-api";


type DashboardStats = {
  companies?: number;
  users?: number;
  courses?: number;
  lessons?: number;
  files?: number;
};


function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconClassName = "bg-amber-50 text-amber-500",
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconClassName?: string;
  trend?: "up" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          {subtitle && (
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">

              {trend === "up" && (
                <TrendingUp
                  size={13}
                  className="text-emerald-500"
                />
              )}

              <span>{subtitle}</span>

            </div>
          )}

        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}


function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

        <h2 className="text-base font-semibold text-slate-900">
          {title}
        </h2>

        {action && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
          >
            {action}
            <ChevronRight size={14} />
          </button>
        )}

      </div>

      <div className="p-5">
        {children}
      </div>

    </section>
  );
}


export default function DashboardPage() {

  /* ==========================================================
     ROLE
     ========================================================== */

  const [role, setRole] = useState("");

  /* ==========================================================
     DASHBOARD DATA
     ========================================================== */

  const [stats, setStats] = useState<DashboardStats>({});

  const [loading, setLoading] = useState(true);


  /* ==========================================================
     READ LOGGED-IN ROLE
     ========================================================== */

  useEffect(() => {

    const storedRole =
      localStorage.getItem("role") || "";

    setRole(storedRole);

  }, []);


  /* ==========================================================
     LOAD DASHBOARD STATS
     ========================================================== */

  useEffect(() => {

    async function loadStats() {

      try {

        const data =
          await getDashboardStats();

        setStats(
          data || {}
        );

      } catch (error) {

        console.error(
          "Failed to load dashboard stats:",
          error
        );

      } finally {

        setLoading(false);

      }

    }

    loadStats();

  }, []);

  /* ==========================================================
     STATS
     ========================================================== */

  const companies =
    stats.companies ?? 0;

  const users =
    stats.users ?? 0;

  const courses =
    stats.courses ?? 0;

  const lessons =
    stats.lessons ?? 0;

  const files =
    stats.files ?? 0;


  return (

    <DashboardLayout>

      <div className="space-y-6">


        {/* =====================================================
            PAGE HEADER
           ===================================================== */}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

          <div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {dashboardTitle}
            </h1>

          </div>
        </div>


        {/* =====================================================
            TOP METRICS
           ===================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <MetricCard
            title={
              role === "super_admin"
                ? "Total Companies"
                : "Users"
            }
            value={
              role === "super_admin"
                ? loading
                  ? "..."
                  : companies.toLocaleString()
                : loading
                  ? "..."
                  : users.toLocaleString()
            }
            subtitle={
              role === "super_admin"
                ? "Registered companies"
                : "Current users"
            }
            icon={
              role === "super_admin"
                ? <Building2 size={22} />
                : <Users size={22} />
            }
            iconClassName="bg-amber-50 text-amber-500"
          />


          <MetricCard
            title="Total Users"
            value={
              loading
                ? "..."
                : users.toLocaleString()
            }
            subtitle="Current platform users"
            icon={<Users size={22} />}
            iconClassName="bg-blue-50 text-blue-500"
          />


          <MetricCard
            title="Active Users"
            value="—"
            subtitle="Active-user analytics"
            icon={<UserCheck size={22} />}
            iconClassName="bg-emerald-50 text-emerald-500"
          />


          <MetricCard
            title="Total Courses"
            value={
              loading
                ? "..."
                : courses.toLocaleString()
            }
            subtitle="Available courses"
            icon={<GraduationCap size={22} />}
            iconClassName="bg-violet-50 text-violet-500"
          />


          <MetricCard
            title="Knowledge Files"
            value={
              loading
                ? "..."
                : files.toLocaleString()
            }
            subtitle="Uploaded files"
            icon={<FileText size={22} />}
            iconClassName="bg-amber-50 text-amber-500"
          />

        </div>


        {/* =====================================================
            SECONDARY METRICS
           ===================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <MetricCard
            title="Total Learning Hours"
            value="—"
            subtitle="Learning analytics"
            icon={<Clock3 size={22} />}
          />


          <MetricCard
            title="Course Completion Rate"
            value="—"
            subtitle="Completion analytics"
            icon={<TrendingUp size={22} />}
            iconClassName="bg-emerald-50 text-emerald-500"
          />


          <MetricCard
            title="Certificates Issued"
            value="—"
            subtitle="Certificate analytics"
            icon={<Award size={22} />}
            iconClassName="bg-orange-50 text-orange-500"
          />


          <MetricCard
            title="AI Conversations"
            value="—"
            subtitle="Assistant analytics"
            icon={<Bot size={22} />}
            iconClassName="bg-indigo-50 text-indigo-500"
          />

        </div>


        {/* =====================================================
            ROLE-SPECIFIC INFORMATION
           ===================================================== */}

        <div className="grid gap-6 xl:grid-cols-3">


          {/* =================================================
              ORGANIZATION / DEPARTMENT
             ================================================= */}

          <SectionCard
            title={
              role === "super_admin"
                ? "Company Overview"
                : role === "company_admin"
                  ? "Department Overview"
                  : "My Learning"
            }
            action="View All"
          >

            <div className="space-y-3">

              {role === "super_admin" && (
                <>

                  <div className="rounded-xl border border-slate-100 p-4">

                    <p className="text-sm font-semibold text-slate-800">
                      Company management
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Manage organizations and company administrators.
                    </p>

                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">

                    <p className="text-sm font-semibold text-slate-800">
                      Platform users
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {users} registered users.
                    </p>

                  </div>

                </>
              )}


              {role === "company_admin" && (
                <>

                  <div className="rounded-xl border border-slate-100 p-4">

                    <p className="text-sm font-semibold text-slate-800">
                      Departments
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Manage your company's departments and department heads.
                    </p>

                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">

                    <p className="text-sm font-semibold text-slate-800">
                      Employees
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      View employee progress and course assignments.
                    </p>

                  </div>

                </>
              )}


              {role === "department_head" && (
                <>

                  <div className="rounded-xl border border-slate-100 p-4">

                    <p className="text-sm font-semibold text-slate-800">
                      Department Employees
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Manage your department's employees.
                    </p>

                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">

                    <p className="text-sm font-semibold text-slate-800">
                      Course Progress
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Track employee learning progress.
                    </p>

                  </div>

                </>
              )}


              {role === "employee" && (
                <>

                  <div className="rounded-xl border border-slate-100 p-4">

                    <p className="text-sm font-semibold text-slate-800">
                      My Courses
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      View your assigned courses and lessons.
                    </p>

                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">

                    <p className="text-sm font-semibold text-slate-800">
                      My Progress
                    </p>
                  </div>

                </>

              )}

            </div>

          </SectionCard>


          {/* =================================================
              LEARNING ANALYTICS
             ================================================= */}

          <SectionCard
            title="Learning Analytics"
            action="View Report"
          >

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-xl border border-slate-100 p-4">

                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500">

                  <GraduationCap size={18} />

                </div>

                <p className="text-xs text-slate-500">
                  Courses
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {courses}
                </p>

              </div>


              <div className="rounded-xl border border-slate-100 p-4">

                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">

                  <FileText size={18} />

                </div>

                <p className="text-xs text-slate-500">
                  Lessons
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {lessons}
                </p>

              </div>


              <div className="rounded-xl border border-slate-100 p-4">

                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-500">

                  <FolderOpen size={18} />

                </div>

                <p className="text-xs text-slate-500">
                  Knowledge Files
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {files}
                </p>

              </div>


              <div className="rounded-xl border border-slate-100 p-4">

                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-500">

                  <TrendingUp size={18} />

                </div>

                <p className="text-xs text-slate-500">
                  Completion
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  —
                </p>

              </div>

            </div>

          </SectionCard>


          {/* =================================================
              AI ANALYTICS
             ================================================= */}

          <SectionCard
            title="AI Analytics"
            action="View Report"
          >

            <div className="space-y-3">

              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">

                    <Bot size={17} />

                  </div>

                  <span className="text-sm text-slate-600">
                    AI Queries
                  </span>

                </div>

                <span className="text-sm font-bold text-slate-900">
                  —
                </span>

              </div>


              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500">

                    <Clock3 size={17} />

                  </div>

                  <span className="text-sm text-slate-600">
                    Response Time
                  </span>

                </div>

                <span className="text-sm font-bold text-slate-900">
                  —
                </span>

              </div>


              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">

                    <ShieldCheck size={17} />

                  </div>

                  <span className="text-sm text-slate-600">
                    Success Rate
                  </span>

                </div>

                <span className="text-sm font-bold text-slate-900">
                  —
                </span>

              </div>

            </div>

          </SectionCard>

        </div>


        {/* =====================================================
            ANALYTICS
           ===================================================== */}

        <div className="grid gap-6 lg:grid-cols-2">

          <SectionCard
            title="User Growth"
            action="View Report"
          >

            <div className="flex h-64 items-end gap-6 rounded-xl bg-slate-50 px-6 pb-6 pt-10">

              {[35, 48, 42, 60, 72, 84].map(
                (height, index) => (

                  <div
                    key={index}
                    className="flex flex-1 items-end justify-center"
                  >

                    <div
                      className="w-full max-w-8 rounded-t-lg bg-slate-300"
                      style={{
                        height: `${height}%`,
                      }}
                    />

                  </div>

                )
              )}

            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-400">

              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>

            </div>

          </SectionCard>


          <SectionCard
            title="Course Completion Trend"
            action="View Report"
          >

            <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50">

              <div className="text-center">

                <TrendingUp
                  size={34}
                  className="mx-auto text-emerald-500"
                />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Completion analytics will appear here
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Backend trend data is not available yet.
                </p>

              </div>

            </div>

          </SectionCard>

        </div>


        {/* =====================================================
            BOTTOM
           ===================================================== */}

        <div className="grid gap-6 xl:grid-cols-3">


          {/* System Health */}

          <SectionCard title="System Health">

            <div className="space-y-4">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <Server
                    size={18}
                    className="text-slate-500"
                  />

                  <span className="text-sm text-slate-600">
                    Server Status
                  </span>

                </div>

                <span className="text-sm font-semibold text-emerald-500">
                  Healthy
                </span>

              </div>


              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <Database
                    size={18}
                    className="text-slate-500"
                  />

                  <span className="text-sm text-slate-600">
                    Database
                  </span>

                </div>

                <span className="text-sm font-semibold text-emerald-500">
                  Connected
                </span>

              </div>


              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <HardDrive
                    size={18}
                    className="text-slate-500"
                  />

                  <span className="text-sm text-slate-600">
                    Storage
                  </span>

                </div>

                <span className="text-sm font-semibold text-slate-700">
                  {files} files
                </span>

              </div>


              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <ShieldCheck
                    size={18}
                    className="text-slate-500"
                  />

                  <span className="text-sm text-slate-600">
                    Knowledge Base
                  </span>

                </div>

                <span className="text-sm font-semibold text-emerald-500">
                  Active
                </span>

              </div>

            </div>

          </SectionCard>


          {/* Recent Activities */}

          <SectionCard title="Recent Activities">

            <div className="space-y-4">

              <div className="flex gap-3">

                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">

                  <Activity size={16} />

                </div>

                <div>

                  <p className="text-sm font-medium text-slate-700">
                    Dashboard loaded successfully
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Just now
                  </p>

                </div>

              </div>


              <div className="flex gap-3">

                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">

                  <Activity size={16} />

                </div>

                <div>

                  <p className="text-sm font-medium text-slate-700">
                    Statistics synchronized
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Just now
                  </p>

                </div>

              </div>

            </div>

          </SectionCard>


        </div>


        {/* =====================================================
            FOOTER
           ===================================================== */}

        <div className="border-t border-slate-200 pt-5 text-xs text-slate-400">

          <div className="flex flex-col justify-between gap-2 sm:flex-row">

            <span>
              © 2026 DADB LMS. All rights reserved.
            </span>

            <span>
              AI Learning Platform
            </span>

          </div>

        </div>

      </div>

    </DashboardLayout>

  );
}