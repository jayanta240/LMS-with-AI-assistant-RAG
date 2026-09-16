"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import EmployeeLayout from "@/components/layout/EmployeeLayout";

import CourseHeader from "@/components/learning/CourseHeader";
import CourseProgress from "@/components/learning/CourseProgress";
import LessonSidebar from "@/components/learning/LessonSidebar";
import LessonViewer from "@/components/learning/LessonViewer";
import AIAssistantCard from "@/components/learning/AIAssistantCard";

import {
  getCourse,
  getCourseLessons,
  getUserCourses,
  getCompletedLessons,
} from "@/lib/course-api";

export default function CoursePage() {

  const params = useParams();
  const courseId = Number(params.id);

  const [lessons, setLessons] = useState<any[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);

  useEffect(() => {

    if (courseId) {

      loadLessons();
      loadCourse();
      loadProgress();
      loadCompletedLessons();

    }

  }, [courseId]);


  async function loadCourse() {

    try {

      const data = await getCourse(courseId);

      setCourse(data);

    } catch (err) {

      console.error(err);

    }

  }


  async function loadProgress() {

    try {

      const userId = Number(
        localStorage.getItem("user_id")
      );

      const courses = await getUserCourses(
        userId
      );

      const currentCourse = courses.find(
        (c: any) => c.id === courseId
      );

      if (currentCourse) {

        setProgress(
          currentCourse.progress || 0
        );

      }

    } catch (err) {

      console.error(err);

    }

  }


  async function loadLessons() {

    try {

      const data = await getCourseLessons(
        courseId
      );

      if (Array.isArray(data)) {

        setLessons(data);

        if (data.length > 0) {

          setSelectedLesson(data[0]);

        }

      } else {

        setLessons([]);

      }

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  }


  async function loadCompletedLessons() {

    try {

      const userId = Number(
        localStorage.getItem("user_id")
      );

      const data =
        await getCompletedLessons(userId);

      setCompletedLessons(
        Array.isArray(data) ? data : []
      );

    } catch (err) {

      console.error(err);

    }

  }


  return (

    <EmployeeLayout>

      <div className="min-h-screen bg-slate-50">

        {/* =====================================================
            COURSE HEADER
           ===================================================== */}

        <div className="border-b border-slate-200 bg-white">

          <div className="mx-auto max-w-7xl px-6 py-7 lg:px-10">

            <Link
              href="/learning"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to My Courses
            </Link>

            <div className="mt-7">

              <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-yellow-600">
                <BookOpen size={15} />
                Learning Program
              </div>

              <CourseHeader
                title={course?.title || "Loading..."}
                description={
                  course?.description ||
                  "Complete each lesson to progress through this training."
                }
              />

            </div>

            <div className="mt-7 max-w-3xl">

              <CourseProgress
                percentage={progress}
              />

            </div>

          </div>

        </div>

        {/* =====================================================
            LEARNING WORKSPACE
           ===================================================== */}

        <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">

          {loading ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50">

                <div className="h-6 w-6 animate-spin rounded-full border-3 border-slate-200 border-t-yellow-500" />

              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                Loading Course
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Preparing your learning workspace...
              </p>

            </div>

          ) : lessons.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">

                <BookOpen
                  size={26}
                  className="text-slate-500"
                />

              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                No Lessons Available
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Your administrator has not added lessons to this course yet.
              </p>

              <Link
                href="/learning"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <ArrowLeft size={16} />
                Back to Courses
              </Link>

            </div>

          ) : (

            <div className="grid gap-7 lg:grid-cols-[300px_minmax(0,1fr)]">

              {/* =================================================
                  LESSON NAVIGATION
                 ================================================= */}

              <aside className="lg:sticky lg:top-6 lg:self-start">

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <div className="border-b border-slate-100 px-5 py-4">

                    <div className="flex items-center gap-2">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700">
                        <BookOpen size={17} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Course Lessons
                        </p>

                        <p className="text-xs text-slate-400">
                          {completedLessons.length} of{" "}
                          {lessons.length} completed
                        </p>
                      </div>

                    </div>

                  </div>

                  <div className="p-3">

                    <LessonSidebar
                      lessons={lessons}
                      selectedLesson={selectedLesson}
                      completedLessons={completedLessons}
                      courseId={courseId}
                      onSelect={setSelectedLesson}
                    />

                  </div>

                </div>

              </aside>

              {/* =================================================
                  LESSON CONTENT
                 ================================================= */}

              <section className="min-w-0 space-y-7">

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                  <LessonViewer
                    lesson={selectedLesson}
                    courseId={courseId}
                    onCompleted={() => {

                      loadProgress();
                      loadCompletedLessons();
                      loadLessons();

                    }}
                  />

                </div>

                {/* AI CARD */}

                <div className="rounded-2xl border border-yellow-200 bg-yellow-50/70 p-1">

                  <AIAssistantCard
                    lessonTitle={selectedLesson?.title}
                  />

                </div>

                {/* COMPLETION NOTE */}

                {progress === 100 && (

                  <div className="flex items-center gap-4 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">

                      <CheckCircle2 size={20} />

                    </div>

                    <div>

                      <p className="text-sm font-bold text-green-900">
                        Course completed
                      </p>

                      <p className="mt-0.5 text-xs text-green-700">
                        You have completed all lessons in this learning program.
                      </p>

                    </div>

                  </div>

                )}

              </section>

            </div>

          )}

        </main>

      </div>

    </EmployeeLayout>

  );
}