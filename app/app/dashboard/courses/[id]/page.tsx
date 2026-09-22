"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  getCourse,
  getCourseLessons,
  createLesson,
  getFiles,
} from "@/lib/course-api";

import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  Film,
  GripVertical,
  Hash,
  Link as LinkIcon,
  Plus,
  Save,
  Type,
  X,
} from "lucide-react";


type Lesson = {
  id: number;
  lesson_order: number;
  title: string;
  content_type: string;
  content_url: string;
};


type FileItem = {
  id: number;
  filename: string;
  filetype: string;
  cloudinary_url?: string;
};


type Course = {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  created_at?: string;
};


export default function CourseDetails() {

  const params = useParams();

  const courseId =
    Number(params.id);


  // ==========================================================
  // COURSE
  // ==========================================================

  const [course, setCourse] =
    useState<Course | null>(null);


  // ==========================================================
  // LESSONS
  // ==========================================================

  const [lessons, setLessons] =
    useState<Lesson[]>([]);


  // ==========================================================
  // FILES
  // ==========================================================

  const [files, setFiles] =
    useState<FileItem[]>([]);


  // ==========================================================
  // LESSON FORM
  // ==========================================================

  const [title, setTitle] =
    useState("");

  const [contentType, setContentType] =
    useState("video");

  const [selectedFile, setSelectedFile] =
    useState("");

  const [order, setOrder] =
    useState(1);


  // ==========================================================
  // UI STATE
  // ==========================================================

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {

    if (!courseId) {
      return;
    }

    loadCourse();
    loadLessons();
    loadFiles();

  }, [courseId]);


  async function loadCourse() {

    try {

      const data =
        await getCourse(courseId);

      if (
        data &&
        data.success === false
      ) {

        setCourse(null);

        return;
      }

      setCourse(data || null);

    } catch (error) {

      console.error(
        "Failed to load course:",
        error
      );

      setCourse(null);

    }

  }


  async function loadLessons() {

    try {

      setLoading(true);

      const data =
        await getCourseLessons(
          courseId
        );

      setLessons(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load lessons:",
        error
      );

      setLessons([]);

    } finally {

      setLoading(false);

    }

  }


  async function loadFiles() {

    try {

      const data =
        await getFiles();

      setFiles(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load files:",
        error
      );

      setFiles([]);

    }

  }


  // ==========================================================
  // ADD LESSON
  // ==========================================================

  async function addLesson() {

    if (!title.trim()) {

      alert(
        "Lesson title is required."
      );

      return;

    }


    if (!selectedFile) {

      alert(
        "Please select an uploaded file."
      );

      return;

    }


    try {

      setSaving(true);

      await createLesson({

        course_id:
          courseId,

        title:
          title.trim(),

        content_type:
          contentType,

        content_url:
          selectedFile,

        lesson_order:
          order,

      });


      setTitle("");

      setSelectedFile("");

      setOrder(
        lessons.length + 2
      );

      setShowCreateForm(false);

      await loadLessons();

    } catch (error: any) {

      console.error(
        "Failed to create lesson:",
        error
      );

      alert(
        error?.message ||
        "Failed to create lesson."
      );

    } finally {

      setSaving(false);

    }

  }


  // ==========================================================
  // CONTENT ICON
  // ==========================================================

  function getContentIcon(
    contentType: string
  ) {

    switch (
      contentType.toLowerCase()
    ) {

      case "video":

        return (
          <Film size={19} />
        );

      case "pdf":

        return (
          <FileText size={19} />
        );

      case "text":

        return (
          <Type size={19} />
        );

      default:

        return (
          <BookOpen size={19} />
        );

    }

  }


  // ==========================================================
  // COURSE NOT FOUND
  // ==========================================================

  if (!loading && !course) {

    return (

      <DashboardLayout>

        <div className="flex min-h-[60vh] items-center justify-center">

          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

            <BookOpen
              size={42}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Course not found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              The requested course could not be loaded.
            </p>

            <Link
              href="/dashboard/courses"
              className="
                mt-6
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-slate-900
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                hover:bg-slate-800
              "
            >

              <ArrowLeft size={16} />

              Back to Courses

            </Link>

          </div>

        </div>

      </DashboardLayout>

    );

  }


  return (

    <DashboardLayout>

      <div className="space-y-6">


        {/* ==================================================
            BACK BUTTON
           ================================================== */}

        <Link
          href="/dashboard/courses"
          className="
            inline-flex
            items-center
            gap-2
            text-sm
            font-medium
            text-slate-500
            transition
            hover:text-slate-900
          "
        >

          <ArrowLeft size={16} />

          Back to Course Library

        </Link>


        {/* ==================================================
            COURSE HEADER
           ================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="grid lg:grid-cols-[260px_1fr]">


            {/* Thumbnail */}

            <div className="relative h-52 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 lg:h-full">

              {course?.thumbnail_url ? (

                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />

              ) : (

                <div className="flex h-full items-center justify-center">

                  <GraduationCapPlaceholder />

                </div>

              )}

            </div>


            {/* Details */}

            <div className="p-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                <div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">

                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                    Published

                  </span>

                  <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                    {course?.title}
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    {course?.description ||
                      "No course description available."}
                  </p>

                </div>


                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">

                  <BookOpen
                    size={18}
                    className="text-amber-500"
                  />

                  <div>

                    <p className="text-xs text-slate-400">
                      Lessons
                    </p>

                    <p className="text-sm font-bold text-slate-900">
                      {lessons.length}
                    </p>

                  </div>

                </div>

              </div>


              <div className="mt-6 grid gap-3 sm:grid-cols-3">

                <div className="rounded-xl border border-slate-100 p-4">

                  <p className="text-xs text-slate-400">
                    Course ID
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    #{course?.id}
                  </p>

                </div>


                <div className="rounded-xl border border-slate-100 p-4">

                  <p className="text-xs text-slate-400">
                    Created
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">

                    {course?.created_at
                      ? new Date(
                          course.created_at
                        ).toLocaleDateString()
                      : "—"}

                  </p>

                </div>


                <div className="rounded-xl border border-slate-100 p-4">

                  <p className="text-xs text-slate-400">
                    Content
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {lessons.length} lesson
                    {lessons.length === 1
                      ? ""
                      : "s"}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>


        {/* ==================================================
            LESSONS HEADER
           ================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-semibold text-amber-600">
              Course Content
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Lessons
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Organize the learning material for this course.
            </p>

          </div>


          <button
            type="button"
            onClick={() =>
              setShowCreateForm(
                true
              )
            }
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-slate-900
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-slate-800
            "
          >

            <Plus size={18} />

            Add Lesson

          </button>

        </div>


        {/* ==================================================
            ADD LESSON FORM
           ================================================== */}

        {showCreateForm && (

          <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

              <div>

                <h3 className="text-base font-semibold text-slate-900">
                  Add Lesson
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Select existing uploaded content and add it to this course.
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowCreateForm(
                    false
                  )
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >

                <X size={18} />

              </button>

            </div>


            <div className="p-6">

              <div className="grid gap-5 md:grid-cols-2">


                {/* Lesson title */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Lesson Title
                  </label>

                  <div className="relative">

                    <BookOpen
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={title}
                      onChange={(e) =>
                        setTitle(
                          e.target.value
                        )
                      }
                      placeholder="e.g. Introduction to Workplace Safety"
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
                        outline-none
                        focus:border-amber-400
                        focus:bg-white
                        focus:ring-2
                        focus:ring-amber-100
                      "
                    />

                  </div>

                </div>


                {/* Content Type */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Content Type
                  </label>

                  <select
                    value={contentType}
                    onChange={(e) => {
                      setContentType(e.target.value);
                      setSelectedFile("");
                    }}
                    className="
                      h-11
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50
                      px-4
                      text-sm
                      text-slate-700
                      outline-none
                      focus:border-amber-400
                      focus:bg-white
                      focus:ring-2
                      focus:ring-amber-100
                    "
                  >

                    <option value="video">
                      Video
                    </option>

                    <option value="pdf">
                      PDF
                    </option>

                    <option value="document">
                      Document
                    </option>

                    <option value="text">
                      Text
                    </option>

                  </select>

                </div>


                {/* Uploaded File */}

                <div className="md:col-span-2">

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Uploaded File
                  </label>

                  <select
                    value={selectedFile}
                    onChange={(e) =>
                      setSelectedFile(
                        e.target.value
                      )
                    }
                    className="
                      h-11
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50
                      px-4
                      text-sm
                      text-slate-700
                      outline-none
                      focus:border-amber-400
                      focus:bg-white
                      focus:ring-2
                      focus:ring-amber-100
                    "
                  >

                    <option value="">
                      Select uploaded file
                    </option>

                    {
                      files
                        .filter((file) => {

                          const name =
                            file.filename.toLowerCase();

                          if (
                            contentType === "video"
                          ) {
                            return (
                              file.filetype === "video"
                            );
                          }

                          if (
                            contentType === "pdf"
                          ) {
                            return (
                              name.endsWith(".pdf")
                            );
                          }

                          if (
                            contentType === "document"
                          ) {
                            return (
                              name.endsWith(".docx")
                            );
                          }

                          return false;

                        })
                        .map((file) => (

                          <option
                            key={file.id}
                            value={
                              file.cloudinary_url ||
                              ""
                            }
                          >
                            {file.filename}
                          </option>

                        ))
                    }

                  </select>

                </div>


                {/* Order */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Lesson Order
                  </label>

                  <div className="relative">

                    <Hash
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="number"
                      min={1}
                      value={order}
                      onChange={(e) =>
                        setOrder(
                          Number(
                            e.target.value
                          )
                        )
                      }
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
                        outline-none
                        focus:border-amber-400
                        focus:bg-white
                        focus:ring-2
                        focus:ring-amber-100
                      "
                    />

                  </div>

                </div>


                {/* File count */}

                <div className="flex items-center rounded-xl border border-slate-100 bg-slate-50 px-4">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500">

                    <LinkIcon
                      size={17}
                    />

                  </div>

                  <div className="ml-3">

                    <p className="text-xs text-slate-400">
                      Uploaded Files
                    </p>

                    <p className="text-sm font-semibold text-slate-800">
                      {files.length}
                    </p>

                  </div>

                </div>

              </div>


              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setShowCreateForm(
                      false
                    )
                  }
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>


                <button
                  type="button"
                  disabled={saving}
                  onClick={addLesson}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-slate-900
                    px-5
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    hover:bg-slate-800
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >

                  <Save size={16} />

                  {saving
                    ? "Adding..."
                    : "Add Lesson"}

                </button>

              </div>

            </div>

          </div>

        )}


        {/* ==================================================
            LESSON LIST
           ================================================== */}

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />

            <p className="mt-4 text-sm text-slate-500">
              Loading lessons...
            </p>

          </div>

        ) : lessons.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

            <BookOpen
              size={40}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 text-base font-semibold text-slate-800">
              No lessons yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add the first lesson to start building this course.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowCreateForm(
                  true
                )
              }
              className="
                mt-5
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-slate-900
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                hover:bg-slate-800
              "
            >

              <Plus size={16} />

              Add First Lesson

            </button>

          </div>

        ) : (

          <div className="space-y-3">

            {lessons.map(
              (lesson, index) => (

                <div
                  key={lesson.id}
                  className="
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-5
                    shadow-sm
                    transition
                    hover:border-amber-200
                    hover:shadow-md
                  "
                >

                  <div className="flex flex-col gap-4 md:flex-row md:items-center">

                    {/* Drag / number */}

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">

                        <GripVertical
                          size={18}
                        />

                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-700">

                        {lesson.lesson_order ||
                          index + 1}

                      </div>

                    </div>


                    {/* Lesson */}

                    <div className="min-w-0 flex-1">

                      <h3 className="truncate text-base font-semibold text-slate-900">

                        {lesson.title}

                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-2">

                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">

                          {getContentIcon(
                            lesson.content_type
                          )}

                          {lesson.content_type}

                        </span>


                        {lesson.content_url && (

                          <span className="inline-flex max-w-[280px] items-center gap-1.5 truncate rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-400">

                            <LinkIcon
                              size={12}
                            />

                            <span className="truncate">
                              {lesson.content_url}
                            </span>

                          </span>

                        )}

                      </div>

                    </div>


                    {/* Status */}

                    <div className="flex items-center gap-2">

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">

                        <CheckCircle2
                          size={13}
                        />

                        Ready

                      </span>

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


/* ============================================================
   FALLBACK COURSE ICON
   ============================================================ */

function GraduationCapPlaceholder() {

  return (

    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">

      <BookOpen
        size={34}
        className="text-white/60"
      />

    </div>

  );

}