"use client";

import { useState, useEffect } from "react";

import { markLessonComplete } from "@/lib/course-api";

interface Props {
  lesson: any;
  courseId: number;
  onCompleted: () => void;
}

export default function LessonViewer({ lesson, courseId, onCompleted }: Props) {

  const [completed, setCompleted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // Reset button state whenever user opens another lesson
  useEffect(() => {
    setCompleted(false);
  }, [lesson?.id]);

  if (!lesson) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow">

        <h2 className="text-2xl font-semibold text-gray-700">
          Select a lesson
        </h2>

        <p className="mt-3 text-gray-500">
          Choose a lesson from the left panel to begin learning.
        </p>

      </div>
    );
  }

  async function handleComplete() {

    try {

      setLoading(true);

      const userId =
        Number(
          localStorage.getItem("user_id")
        );

      const response =
        await markLessonComplete(
          userId,
          courseId,
          lesson.id
        );

      if (response.success) {

        setCompleted(true);
        onCompleted();

        alert("Lesson marked as completed!");

      } else {

        alert("Unable to update progress.");

      }

    } catch (err) {

      console.error(err);

      alert("Something went wrong.");

    } finally {

      setLoading(false);

    }

  }
  return (

    <div className="rounded-2xl bg-white p-8 shadow">

      {/* Lesson Header */}

      <div className="mb-6">

        <span
          className="rounded-full px-3 py-1 text-sm font-medium"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--brand-primary) 12%, white)",
            color: "var(--brand-primary)",
          }}
        >

          Lesson {lesson.lesson_order}

        </span>

        <h2 className="mt-4 text-3xl font-bold">

          {lesson.title}

        </h2>

      </div>

      {/* Lesson Content */}

      {lesson.content_type === "video" && (

        <video
          key={lesson.id}
          controls
          className="w-full rounded-xl border"
        >

         <source
           src={lesson.content_url}
           type="video/mp4"
          />

         Your browser does not support video.

        </video>

      )}

      {lesson.content_type === "pdf" && (

        <iframe
          src={lesson.content_url}
          className="h-[700px] w-full rounded-xl border"
        />

      )}

      {lesson.content_type === "document" && (

        <div className="rounded-xl border bg-gray-50 p-8 text-center">

          <h3 className="text-xl font-semibold text-gray-800">
            Document Resource
          </h3>

          <p className="mt-2 text-gray-500">
            Open or download the document to view its contents.
          </p>

          <a
            href={lesson.content_url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-xl px-6 py-3 font-medium transition hover:opacity-90"
            style={{
              backgroundColor: "var(--brand-primary)",
              color: "var(--brand-primary-text)",
            }}
          >
            Open Document
          </a>

        </div>

      )}

      {lesson.content_type === "text" && (

        <div className="rounded-xl border bg-gray-50 p-6 leading-8">

          {lesson.content_url}

        </div>

      )}

      {/* Action Buttons */}

      <div className="mt-8 flex gap-4">

        <button

          onClick={handleComplete}

          disabled={completed || loading}

          className={`rounded-xl px-6 py-3 font-medium text-white transition ${
            completed
              ? "bg-gray-500 cursor-not-allowed"
              : "hover:opacity-90"
          }`}

          style={
            completed
              ? undefined
              : {
                  backgroundColor: "var(--brand-primary)",
                  color: "var(--brand-primary-text)",
                }
          }
        >

          {loading
            ? "Saving..."
            : completed
            ? "✓ Completed"
            : "✓ Mark Complete"}

        </button>

        <a

          href={lesson.content_url}

          download

          className="rounded-xl px-6 py-3 font-medium transition hover:bg-slate-50"
          style={{
            border: "1px solid var(--brand-primary)",
            color: "var(--brand-primary)",
          }}

        >

          Download Resource

        </a>

      </div>

    </div>

  );

}