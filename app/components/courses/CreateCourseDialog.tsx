"use client";

import { useState } from "react";
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

  async function handleCreate() {
    if (!title.trim()) return;

    await createCourse(title, description);

    setTitle("");
    setDescription("");

    setOpen(false);

    onCreated();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
      >
        + Create Course
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

            <h2 className="mb-6 text-2xl font-bold text-black">
              Create Course
            </h2>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Course Title"
              className="mb-4 w-full rounded-lg border p-3"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={5}
              className="mb-6 w-full rounded-lg border p-3"
            />

            <div className="flex justify-end gap-3">

              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border px-5 py-2"
              >
                Cancel
              </button>

              <button
                onClick={handleCreate}
                className="rounded-lg bg-blue-600 px-5 py-2 text-white"
              >
                Create
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}