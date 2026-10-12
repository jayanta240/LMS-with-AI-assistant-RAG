"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  Search,
  Trash2,
  ChevronRight,
  FileText,
  LayoutGrid,
  List,
} from "lucide-react";

import {
  getCourses,
  deleteCourse,
} from "@/lib/course-api";

import CreateCourseDialog from "@/components/courses/CreateCourseDialog";


type Course = {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  created_at?: string;
  category?: string | null;
  level?: string | null;
  duration?: string | null;
  course_type?: string;
  status?: string;
};


export default function CoursesPage() {

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<"all" | "recent" | "az">("all");

  const [viewMode, setViewMode] =
    useState<"grid" | "list">("grid");


  // ==========================================================
  // LOAD COURSES
  // ==========================================================

  useEffect(() => {

    loadCourses();

  }, []);


  async function loadCourses() {

    try {

      setLoading(true);

      const data =
        await getCourses();

      setCourses(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load courses:",
        error
      );

      setCourses([]);

    } finally {

      setLoading(false);

    }

  }


  // ==========================================================
  // DELETE
  // ==========================================================

  async function handleDelete(
    id: number,
    title: string
  ) {

    const confirmed =
      window.confirm(
        `Delete "${title}"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {

      await deleteCourse(id);

      await loadCourses();

    } catch (error: any) {

      console.error(
        "Delete course error:",
        error
      );

      alert(
        error?.message ||
        "Failed to delete course."
      );

    }

  }


  // ==========================================================
  // SEARCH
  // ==========================================================

  const filteredCourses =
    useMemo(() => {
      const query = search.trim().toLowerCase();
      let result = courses.filter((course) =>
        !query ||
        course.title?.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query)
      );

      if (activeTab === "recent") {
        result = [...result].sort((a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      } else if (activeTab === "az") {
        result = [...result].sort((a, b) =>
          a.title.localeCompare(b.title)
        );
      }

      return result;
    }, [courses, search, activeTab]);


  return (

    <DashboardLayout>

      <div className="space-y-6">


        {/* ==================================================
            HEADER
           ================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-semibold text-amber-600">
              Learning Management
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Course Library
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create, manage, and organize training courses.
            </p>

          </div>


          <div className="flex items-center gap-3">

            <CreateCourseDialog
              onCreated={loadCourses}
            />

          </div>

        </div>


        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 pt-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Course views">
            {([
              ["all", "Course Library"],
              ["recent", "Recently Added"],
              ["az", "A–Z"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === key ? "border-amber-400 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-3 sm:pb-0">
            <span className="mr-2 text-sm text-slate-500">{filteredCourses.length} courses</span>
            <button type="button" aria-label="Grid view" onClick={() => setViewMode("grid")} className={`rounded-lg border p-2 ${viewMode === "grid" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500"}`}><LayoutGrid size={17} /></button>
            <button type="button" aria-label="List view" onClick={() => setViewMode("list")} className={`rounded-lg border p-2 ${viewMode === "list" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500"}`}><List size={17} /></button>
          </div>
        </div>

        {/* ==================================================
            COURSE STATS
           ================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Total Courses
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {courses.length}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

                <GraduationCap size={21} />

              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Published
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {courses.filter((course) => (course.status || "published") === "published").length}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">

                <BookOpen size={21} />

              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Learning Content
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  —
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                <FileText size={21} />

              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Total Lessons
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  —
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">

                <Clock3 size={21} />

              </div>

            </div>

          </div>

        </div>


        {/* ==================================================
            SEARCH / FILTER TOOLBAR
           ================================================== */}

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">

          <div className="relative w-full lg:max-w-lg">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search courses..."
              className="
                h-11
                w-full
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                pl-10
                pr-4
                text-sm
                text-slate-700
                outline-none
                transition
                focus:border-amber-400
                focus:bg-white
                focus:ring-2
                focus:ring-amber-100
              "
            />

          </div>


          <div className="flex items-center gap-3">

            <span className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-500">

              {filteredCourses.length} course
              {filteredCourses.length === 1
                ? ""
                : "s"}

            </span>

          </div>

        </div>


        {/* ==================================================
            COURSE GRID
           ================================================== */}

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />

            <p className="mt-4 text-sm text-slate-500">
              Loading courses...
            </p>

          </div>

        ) : filteredCourses.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

            <GraduationCap
              size={40}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 text-base font-semibold text-slate-800">
              No courses found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search."
                : "Create your first course to get started."}
            </p>

          </div>

        ) : (

          <div className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2 xl:grid-cols-4" : "grid gap-3 grid-cols-1"}>

            {filteredCourses.map(
              (course) => (

                <div
                  key={course.id}
                  className="
                    group
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    shadow-sm
                    transition
                    hover:-translate-y-0.5
                    hover:border-amber-200
                    hover:shadow-lg
                  "
                >

                  {/* ==================================================
                      THUMBNAIL
                     ================================================== */}

                  <div className={viewMode === "grid" ? "relative h-40 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" : "relative h-28 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 sm:h-36"}>

                    {course.thumbnail_url ? (

                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                    ) : (

                      <div className="flex h-full items-center justify-center">

                        <GraduationCap
                          size={48}
                          className="text-white/40"
                        />

                      </div>

                    )}


                    <div className="absolute left-4 top-4">

                      <span className={`rounded-full border border-white/30 px-2.5 py-1 text-[11px] font-semibold capitalize text-white shadow-sm backdrop-blur ${course.status === "published" ? "bg-emerald-600/90" : "bg-slate-950/65"}`}>
                        {(course.status || "published").replace("_", " ")}
                      </span>

                    </div>

                  </div>


                  {/* ==================================================
                      CONTENT
                     ================================================== */}

                  <div className="p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <h2 className="line-clamp-2 text-lg font-bold text-slate-900">

                          {course.title}

                        </h2>

                        <p className="mt-1 text-xs font-medium text-slate-400">

                          {[course.category, course.level].filter(Boolean).join(" • ") || (course.course_type || "online").replace("_", " ")}

                        </p>

                      </div>

                    </div>


                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">

                      {course.description ||
                        "No course description available."}

                    </p>


                    <div className="mt-5 flex flex-wrap gap-2">

                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">

                        <CalendarDays size={13} />

                        {course.created_at
                          ? new Date(
                              course.created_at
                            ).toLocaleDateString()
                          : "Recently created"}

                      </span>


                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">

                        <BookOpen size={13} />

                        {course.duration || "Course"}
                      </span>

                    </div>


                    {/* =================================================
                        FOOTER
                       ================================================= */}

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

                      <Link
                        href={`/dashboard/courses/${course.id}`}
                        className="
                          inline-flex
                          items-center
                          gap-1.5
                          rounded-lg
                          bg-slate-900
                          px-3
                          py-2
                          text-xs
                          font-semibold
                          text-white
                          transition
                          hover:bg-slate-800
                        "
                      >

                        Manage Course

                        <ChevronRight size={14} />

                      </Link>


                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            course.id,
                            course.title
                          )
                        }
                        className="
                          inline-flex
                          items-center
                          gap-1.5
                          rounded-lg
                          px-3
                          py-2
                          text-xs
                          font-semibold
                          text-red-500
                          transition
                          hover:bg-red-50
                        "
                      >

                        <Trash2 size={14} />

                        Delete

                      </button>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </DashboardLayout>

  );
}