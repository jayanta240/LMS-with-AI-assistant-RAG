"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createCourse } from "@/lib/course-api";

type Props = {
  onCreated: () => void;
};

export default function CreateCourseDialog({
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (creating || !title.trim()) {
      return;
    }

    try {
      setCreating(true);
      setError("");

      await createCourse(
        title.trim(),
        description.trim()
      );

      setTitle("");
      setDescription("");
      setOpen(false);

      onCreated();
    } catch (error: any) {
      console.error(
        "Create course error:",
        error
      );

      setError(
        error?.message ||
          "Failed to create course."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition hover:opacity-90"
        style={{
          backgroundColor:
            "var(--brand-primary)",
          color:
            "var(--brand-primary-text)",
        }}
      >
        <span>+ Create Course</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-900">
                Create Course
              </h2>

              <button
                type="button"
                onClick={() => {
                  if (!creating) {
                    setOpen(false);
                    setError("");
                  }
                }}
                className="cursor-pointer rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                disabled={creating}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="Course Title"
              disabled={creating}
              className="mb-4 w-full rounded-lg border border-slate-200 p-3 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
            />

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Description"
              rows={5}
              disabled={creating}
              className="mb-6 w-full rounded-lg border border-slate-200 p-3 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
            />

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={() => {
                  if (!creating) {
                    setOpen(false);
                    setError("");
                  }
                }}
                disabled={creating}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={
                  creating ||
                  !title.trim()
                }
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor:
                    "var(--brand-primary)",
                  color:
                    "var(--brand-primary-text)",
                }}
              >
                {creating && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                {creating
                  ? "Creating..."
                  : "Create Course"}
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}