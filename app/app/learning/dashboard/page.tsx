"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Trophy,
} from "lucide-react";

import EmployeeLayout from "@/components/layout/EmployeeLayout";

import { getUserCourses } from "@/lib/course-api";
import { getMyCertificates } from "@/lib/api";


// ============================================================
// TYPES
// ============================================================

type Certificate = {
  id: number;
  certificate_number: string;
  certificate_uuid: string;

  user_id: number;
  course_id: number;
  company_id: number;

  user_name: string;
  course_title: string;
  company_name: string;

  logo_url: string;

  primary_color: string;
  secondary_color: string;
  accent_color: string;

  issued_at: string;
  pdf_url: string;

  status: string;
};


// ============================================================
// PAGE
// ============================================================

export default function LearningDashboardPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [userName, setUserName] = useState("Learner");

  const [loading, setLoading] = useState(true);

  const [certificates, setCertificates] =
    useState<Certificate[]>([]);

  const [certificateLoading, setCertificateLoading] =
    useState(true);


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    setUserName(
      localStorage.getItem("user_name") ||
        localStorage.getItem("name") ||
        "Learner"
    );

    loadDashboard();
  }, []);


  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  async function loadDashboard() {
    try {
      const userId =
        localStorage.getItem("user_id");

      if (!userId) {
        setLoading(false);
        setCertificateLoading(false);
        return;
      }


      // ------------------------------------------------------
      // LOAD COURSES
      // ------------------------------------------------------

      const courseData =
        await getUserCourses(
          Number(userId)
        );

      setCourses(
        Array.isArray(courseData)
          ? courseData
          : []
      );


      // ------------------------------------------------------
      // LOAD CERTIFICATES
      // ------------------------------------------------------

      try {
        const certificateData =
          await getMyCertificates();

        setCertificates(
          Array.isArray(
            certificateData?.certificates
          )
            ? certificateData.certificates
            : []
        );

      } catch (certificateError) {
        console.error(
          "Failed to load certificates:",
          certificateError
        );

        setCertificates([]);
      }

    } catch (error) {
      console.error(
        "Failed to load learner dashboard:",
        error
      );

    } finally {
      setLoading(false);
      setCertificateLoading(false);
    }
  }


  // ==========================================================
  // STATISTICS
  // ==========================================================

  const stats = useMemo(() => {
    const total = courses.length;


    const completed =
      courses.filter(
        (course) =>
          Number(course.progress || 0) === 100
      ).length;


    const inProgress =
      courses.filter(
        (course) =>
          Number(course.progress || 0) > 0 &&
          Number(course.progress || 0) < 100
      ).length;


    const notStarted =
      courses.filter(
        (course) =>
          !course.progress ||
          Number(course.progress) === 0
      ).length;


    const overallProgress =
      total > 0
        ? Math.round(
            courses.reduce(
              (sum, course) =>
                sum +
                Number(
                  course.progress || 0
                ),
              0
            ) / total
          )
        : 0;


    return {
      total,
      completed,
      inProgress,
      notStarted,
      overallProgress,
    };

  }, [courses]);


  // ==========================================================
  // ACTIVE COURSES
  // ==========================================================

  const activeCourses =
    courses
      .filter(
        (course) =>
          Number(course.progress || 0) > 0 &&
          Number(course.progress || 0) < 100
      )
      .sort(
        (a, b) =>
          Number(b.progress || 0) -
          Number(a.progress || 0)
      )
      .slice(0, 3);


  // ==========================================================
  // COMPLETED COURSES
  // ==========================================================

  const completedCourses =
    courses
      .filter(
        (course) =>
          Number(course.progress || 0) === 100
      )
      .slice(0, 3);


  // ==========================================================
  // CERTIFICATE LOOKUP
  // ==========================================================

  const certificateByCourse =
    useMemo(() => {
      const map: Record<
        number,
        Certificate
      > = {};


      certificates.forEach(
        (certificate) => {
          map[
            Number(
              certificate.course_id
            )
          ] = certificate;
        }
      );


      return map;

    }, [certificates]);


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <EmployeeLayout>

      <div className="min-h-screen bg-slate-50">

        {/* ==================================================
            HERO
           ================================================== */}

        <section className="border-b border-slate-200 bg-white">

          <div className="mx-auto max-w-7xl px-6 py-9 lg:px-10">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div>

                <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-slate-700">

                  <Sparkles
                    size={14}
                    className="text-yellow-600"
                  />

                  Learner Dashboard

                </div>


                <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
                  Welcome, {userName}
                </h1>


                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  Track your learning progress,
                  review achievements, and continue
                  building your skills.
                </p>

              </div>


              <Link
                href="/learning"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View My Courses
                <ArrowRight size={17} />
              </Link>

            </div>

          </div>

        </section>


        {/* ==================================================
            CONTENT
           ================================================== */}

        <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">

          {loading ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-yellow-500" />

              <p className="mt-4 text-sm text-slate-500">
                Loading your dashboard...
              </p>

            </div>

          ) : (

            <>

              {/* =================================================
                  STAT CARDS
                 ================================================= */}

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

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
                    {stats.total}
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
                    {stats.inProgress}
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
                    {stats.completed}
                  </p>

                </div>


                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Trophy size={21} />
                    </div>

                    <span className="text-xs font-medium text-slate-400">
                      Overall
                    </span>

                  </div>


                  <p className="mt-5 text-sm text-slate-500">
                    Learning Progress
                  </p>


                  <p className="mt-1 text-3xl font-bold text-slate-950">
                    {stats.overallProgress}%
                  </p>

                </div>

              </div>


              {/* =================================================
                  PROGRESS
                 ================================================= */}

              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

                  <div>

                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-yellow-600">
                      Your Progress
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-950">
                      Overall Learning Progress
                    </h2>

                  </div>


                  <span className="text-2xl font-bold text-slate-950">
                    {stats.overallProgress}%
                  </span>

                </div>


                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                    style={{
                      width: `${stats.overallProgress}%`,
                    }}
                  />

                </div>


                <p className="mt-3 text-sm text-slate-500">
                  Keep progressing through your
                  assigned learning programs.
                </p>

              </section>


              {/* =================================================
                  ACTIVE COURSES
                 ================================================= */}

              <section className="mt-10">

                <div className="mb-5 flex items-end justify-between">

                  <div>

                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-yellow-600">
                      Continue Learning
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-950">
                      Active Courses
                    </h2>

                  </div>


                  <Link
                    href="/learning"
                    className="text-sm font-semibold text-slate-600 hover:text-slate-950"
                  >
                    View all
                  </Link>

                </div>


                {activeCourses.length === 0 ? (

                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

                    <BookOpen
                      className="mx-auto text-slate-400"
                      size={30}
                    />


                    <p className="mt-3 font-semibold text-slate-700">
                      No courses are currently in progress.
                    </p>


                    <Link
                      href="/learning"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      Browse My Courses
                      <ArrowRight size={16} />
                    </Link>

                  </div>

                ) : (

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                    {activeCourses.map(
                      (course) => (

                        <Link
                          key={course.id}
                          href={`/learning/${course.id}`}
                          className="group"
                        >

                          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">

                            <div className="flex items-start justify-between gap-4">

                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
                                <BookOpen size={21} />
                              </div>


                              <span className="text-sm font-bold text-slate-900">
                                {course.progress}%
                              </span>

                            </div>


                            <h3 className="mt-5 line-clamp-2 text-lg font-bold text-slate-950">
                              {course.title}
                            </h3>


                            <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                              {course.description}
                            </p>


                            <div className="mt-5 h-2 rounded-full bg-slate-100">

                              <div
                                className="h-full rounded-full bg-yellow-500"
                                style={{
                                  width: `${course.progress}%`,
                                }}
                              />

                            </div>


                            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">

                              <span>
                                {course.completed_lessons || 0}{" "}
                                of{" "}
                                {course.total_lessons || 0}{" "}
                                lessons
                              </span>


                              <ArrowRight
                                size={16}
                                className="transition group-hover:translate-x-1 group-hover:text-slate-800"
                              />

                            </div>

                          </article>

                        </Link>

                      )
                    )}

                  </div>

                )}

              </section>


              {/* =================================================
                  CERTIFICATES
                 ================================================= */}

              <section className="mt-10">

                <div className="mb-5">

                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-yellow-600">
                    Achievements
                  </p>


                  <div className="mt-1 flex items-center justify-between gap-4">

                    <div>

                      <h2 className="text-2xl font-bold text-slate-950">
                        Certificates
                      </h2>


                      <p className="mt-1 text-sm text-slate-500">
                        Certificates for your completed
                        learning programs.
                      </p>

                    </div>


                    {certificates.length > 0 && (

                      <span className="hidden rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 sm:inline-flex">
                        {certificates.length} earned
                      </span>

                    )}

                  </div>

                </div>


                {/* ==================================================
                    CERTIFICATE LOADING
                   ================================================== */}

                {certificateLoading ? (

                  <div className="rounded-2xl border border-slate-200 bg-white p-8">

                    <div className="flex items-center gap-3">

                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-yellow-500" />

                      <p className="text-sm text-slate-500">
                        Loading certificates...
                      </p>

                    </div>

                  </div>

                ) : completedCourses.length === 0 ? (

                  /* =================================================
                     NO COMPLETED COURSES
                     ================================================= */

                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10">

                    <div className="flex flex-col items-center justify-center text-center">

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-700">

                        <Award size={27} />

                      </div>


                      <h3 className="mt-4 text-lg font-bold text-slate-900">
                        No certificates yet
                      </h3>


                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Complete a learning program to unlock your certificate.
                      </p>

                    </div>

                  </div>

                ) : (

                  /* =================================================
                     COMPLETED COURSES
                     ================================================= */

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                    {completedCourses.map(
                      (course) => {

                        const certificate =
                          certificateByCourse[
                            Number(course.id)
                          ];


                        const hasCertificate =
                          Boolean(
                            certificate
                          );


                        const pdfUrl =
                          certificate?.pdf_url
                            ? certificate.pdf_url.startsWith(
                                "http"
                              )
                              ? certificate.pdf_url
                              : `${
                                  process.env
                                    .NEXT_PUBLIC_API_URL ||
                                  "http://localhost:8000"
                                }${
                                  certificate.pdf_url
                                }`
                            : "";


                        return (
                          <div
                            key={course.id}
                            className="
                              overflow-hidden
                              rounded-2xl
                              border
                              border-yellow-200
                              bg-gradient-to-br
                              from-yellow-50
                              to-white
                              shadow-sm
                            "
                          >

                            <div className="p-6">

                              {/* ==================================
                                  HEADER
                                 ================================== */}

                              <div className="flex items-start justify-between gap-4">

                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500 text-white">

                                  <Award size={21} />

                                </div>


                                {hasCertificate ? (

                                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                    Certificate Issued
                                  </span>

                                ) : (

                                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    Processing
                                  </span>

                                )}

                              </div>


                              {/* ==================================
                                  COURSE
                                 ================================== */}

                              <h3 className="mt-5 text-lg font-bold text-slate-950">
                                {course.title}
                              </h3>


                              <p className="mt-2 text-sm text-slate-500">
                                Learning program successfully completed.
                              </p>


                              {/* ==================================
                                  CERTIFICATE DETAILS
                                 ================================== */}

                              <div className="mt-5 border-t border-yellow-100 pt-4">

                                {hasCertificate ? (

                                  <>

                                    <div className="grid grid-cols-2 gap-4">

                                      <div>

                                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                          Certificate ID
                                        </p>


                                        <p className="mt-1 truncate text-xs font-semibold text-slate-800">
                                          {
                                            certificate.certificate_number
                                          }
                                        </p>

                                      </div>


                                      <div>

                                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                          Issued
                                        </p>


                                        <p className="mt-1 text-xs font-semibold text-slate-800">

                                          {
                                            certificate.issued_at
                                              ? new Date(
                                                  certificate.issued_at
                                                ).toLocaleDateString(
                                                  "en-IN",
                                                  {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                  }
                                                )
                                              : "—"
                                          }

                                        </p>

                                      </div>

                                    </div>


                                    {/* ==================================
                                        ACTIONS
                                       ================================== */}

                                    {pdfUrl ? (

                                      <div className="mt-5 flex flex-wrap gap-2">

                                        <a
                                          href={pdfUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="
                                            inline-flex
                                            items-center
                                            gap-2
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            px-3
                                            py-2
                                            text-xs
                                            font-semibold
                                            text-slate-700
                                            transition
                                            hover:bg-slate-50
                                          "
                                        >

                                          <ExternalLink
                                            size={14}
                                          />

                                          View Certificate

                                        </a>


                                        <a
                                          href={pdfUrl}
                                          download
                                          className="
                                            inline-flex
                                            items-center
                                            gap-2
                                            rounded-xl
                                            bg-slate-950
                                            px-3
                                            py-2
                                            text-xs
                                            font-semibold
                                            text-white
                                            transition
                                            hover:bg-slate-800
                                          "
                                        >

                                          <Download
                                            size={14}
                                          />

                                          Download PDF

                                        </a>

                                      </div>

                                    ) : (

                                      <div className="mt-4 rounded-xl bg-white/70 px-3 py-2.5">

                                        <p className="text-xs font-medium text-amber-700">
                                          Certificate is being generated.
                                        </p>

                                      </div>

                                    )}

                                  </>

                                ) : (

                                  <div className="rounded-xl bg-white/70 px-3 py-3">

                                    <p className="text-xs font-medium text-amber-700">
                                      Course completed. Your certificate is being prepared.
                                    </p>

                                  </div>

                                )}

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                )}

              </section>


              {/* =================================================
                  AI ASSISTANT
                 ================================================= */}

              <section className="mt-10 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">

                <div className="grid gap-7 px-7 py-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">

                  <div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-yellow-300">

                      <Sparkles size={14} />

                      DADB AI Assistant

                    </div>


                    <h2 className="mt-4 text-2xl font-bold text-white">
                      Need help with your learning?
                    </h2>


                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                      Ask questions about your lessons,
                      videos, and learning materials.
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

            </>

          )}

        </main>

      </div>

    </EmployeeLayout>
  );
}