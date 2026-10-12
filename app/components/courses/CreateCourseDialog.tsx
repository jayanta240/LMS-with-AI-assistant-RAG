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
  const [thumbnailUrl, setThumbnailUrl] = useState("");
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
        description.trim(),
        thumbnailUrl.trim()
      );

      setTitle("");
      setDescription("");
      setThumbnailUrl("");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">

          <div className="my-6 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">\n\n            <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white px-6 py-5 sm:px-8">\n              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Course builder · Step 1 of 1</p>\n              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Add New Course</h2>\n              <p className="mt-1 text-sm text-slate-500">Set up the core course information. You can add lessons after creating the course.</p>\n            </div>\n\n            <div className="p-6 sm:p-8">

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
              aria-label="Course title"\n              placeholder="Course title *"
              disabled={creating}
              className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 disabled:bg-slate-50"
            />

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              aria-label="Course description"\n              placeholder="Course description *"
              rows={5}
              disabled={creating}
              className="mb-5 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 disabled:bg-slate-50"
            />

            <div className="mb-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Course thumbnail URL <span className="font-normal text-slate-400">(optional)</span></label>
              <input
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://example.com/course-thumbnail.jpg"
                disabled={creating}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 disabled:bg-slate-50"
              />
              {thumbnailUrl.trim() && (
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img src={thumbnailUrl} alt="Course thumbnail preview" className="h-36 w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">Use a publicly accessible image URL. Thumbnail uploads can be added separately.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">

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