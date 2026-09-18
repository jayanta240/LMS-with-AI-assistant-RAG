"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Sparkles,
} from "lucide-react";

import EmployeeLayout from "@/components/layout/EmployeeLayout";
import { getUserCourses } from "@/lib/course-api";

export default function LearningPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Learner");

  const inProgressCourses = courses.filter(
    (c) => c.progress > 0 && c.progress < 100
  );

  const completedCourses = courses.filter(
    (c) => c.progress === 100
  );

  const notStartedCourses = courses.filter(
    (c) => !c.progress || c.progress === 0
  );

  useEffect(() => {
    setUserName(
      localStorage.getItem("user_name") || "Learner"
    );

    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const userId = localStorage.getItem("user_id");

      if (!userId) return;

      const data = await getUserCourses(Number(userId));

      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <EmployeeLayout>
      <div className="min-h-screen bg-slate-50">

        {/* =====================================================
            HERO
           ===================================================== */}

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-10">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div className="max-w-3xl">

                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <Sparkles size={14} className="text-yellow-600" />
                  Future-ready learning
                </div>

                <h1 className="text-4xl font-bold tracking-tight text-slate-950 lg:text-5xl">
                  Welcome, {userName}
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 lg:text-lg">
                  Continue your learning journey, build practical skills,
                  and complete your assigned programs.
                </p>

              </div>

              <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 lg:block">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Your Learning
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  Learn • Apply • Progress
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            STATS
           ===================================================== */}

        <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
                  <GraduationCap size={21} />
                </div>

                <span className="text-xs font-medium text-slate-400">
                  Assigned
                </span>
              </div>

              <p className="mt-5 text-sm text-slate-500">
                Total Courses
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-950">
                {courses.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Clock3 size={21} />
                </div>

                <span className="text-xs font-medium text-slate-400">
                  Active
                </span>
              </div>

              <p className="mt-5 text-sm text-slate-500">
                In Progress
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-950">
                {inProgressCourses.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <CheckCircle2 size={21} />
                </div>

                <span className="text-xs font-medium text-slate-400">
                  Completed
                </span>
              </div>

              <p className="mt-5 text-sm text-slate-500">
                Completed Courses
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-950">
                {completedCourses.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <BookOpen size={21} />
                </div>

                <span className="text-xs font-medium text-slate-400">
                  Not Started
                </span>
              </div>

              <p className="mt-5 text-sm text-slate-500">
                Awaiting Start
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-950">
                {notStartedCourses.length}
              </p>
            </div>

          </div>

          {/* ===================================================
              COURSES
             =================================================== */}

          <section className="mt-12">

            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-yellow-600">
                  Learning Programs
                </p>

                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                  My Courses
                </h2>

                <p className="mt-1 text-slate-500">
                  Continue where you left off or start your next program.
                </p>
              </div>

              <span className="text-sm text-slate-400">
                {courses.length} assigned
              </span>

            </div>

            {loading ? (

              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-yellow-500" />
                <p className="mt-4 text-sm text-slate-500">
                  Loading your courses...
                </p>
              </div>

            ) : courses.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <GraduationCap size={26} className="text-slate-500" />
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-800">
                  No Assigned Courses
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Your administrator has not assigned any courses yet.
                  Your learning programs will appear here once assigned.
                </p>
              </div>

            ) : (

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                {courses.map((course) => (

                  <Link
                    key={course.id}
                    href={`/learning/${course.id}`}
                    className="group"
                  >

                    <article className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg">

                      <div className="relative h-2 bg-slate-100">
                        <div
                          className="h-full bg-yellow-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, course.progress || 0)
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="p-6">

                        <div className="flex items-start justify-between gap-4">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
                            <BookOpen size={22} />
                          </div>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                            {course.progress === 100
                              ? "Completed"
                              : course.progress > 0
                              ? "In Progress"
                              : "Not Started"}
                          </span>

                        </div>

                        <h3 className="mt-5 line-clamp-2 text-xl font-bold text-slate-950">
                          {course.title}
                        </h3>

                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                          {course.description}
                        </p>

                        <div className="mt-6">

                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-500">
                              Progress
                            </span>

                            <span className="font-bold text-slate-900">
                              {course.progress || 0}%
                            </span>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-yellow-500 transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, course.progress || 0)
                                )}%`,
                              }}
                            />
                          </div>

                          <p className="mt-2 text-xs text-slate-400">
                            {course.completed_lessons || 0} of{" "}
                            {course.total_lessons || 0} lessons completed
                          </p>

                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">

                          <span className="text-sm font-semibold text-slate-700">
                            {course.progress === 100
                              ? "Review Course"
                              : "Continue Learning"}
                          </span>

                          <ArrowRight
                            size={18}
                            className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900"
                          />

                        </div>

                      </div>

                    </article>

                  </Link>

                ))}

              </div>

            )}

          </section>

          {/* ===================================================
              AI ASSISTANT
             =================================================== */}

          <section className="mt-12 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">

            <div className="grid gap-8 px-7 py-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10 lg:py-10">

              <div>

                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-yellow-300">
                  <Sparkles size={14} />
                  DADB Learning Assistant
                </div>

                <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
                  Learn beyond the lesson.
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Ask questions about your course material, lectures,
                  videos, and learning resources whenever you need help.
                </p>

              </div>

              <Link
                href="/assistant"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-6 py-3.5 font-bold text-slate-950 transition hover:bg-yellow-400"
              >
                Open AI Assistant
                <ArrowRight size={18} />
              </Link>

            </div>

          </section>

        </main>

      </div>
    </EmployeeLayout>
  );
}