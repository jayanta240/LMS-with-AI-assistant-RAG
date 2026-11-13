"use client";

import { useEffect, useState } from "react";
import { BookText, Save, Trash2 } from "lucide-react";
import {
  deleteLearnerNote,
  getLearnerNote,
  saveLearnerNote,
} from "@/lib/course-api";

interface Props {
  courseId: number;
  lessonId: number;
}

export default function LearnerNotes({ courseId, lessonId }: Props) {
  const [noteId, setNoteId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setMessage("");
    setContent("");
    setNoteId(null);

    getLearnerNote(courseId, lessonId)
      .then((result) => {
        if (!active) return;
        const note = result?.note;
        setNoteId(note?.id ?? null);
        setContent(note?.content ?? "");
      })
      .catch((err) => {
        if (active) setError(err?.message || "Unable to load your note.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseId, lessonId]);

  async function handleSave() {
    if (!content.trim()) {
      setError("Write something before saving.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await saveLearnerNote(courseId, lessonId, content.trim());
      setNoteId(result.note.id);
      setContent(result.note.content);
      setMessage("Note saved.");
    } catch (err: any) {
      setError(err?.message || "Unable to save your note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!noteId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteLearnerNote(noteId);
      setNoteId(null);
      setContent("");
      setMessage("Note deleted.");
    } catch (err: any) {
      setError(err?.message || "Unable to delete your note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <BookText size={19} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">My Lesson Notes</h3>
          <p className="text-sm text-slate-500">Private notes saved for this lesson</p>
        </div>
      </div>

      {loading ? (
        <p className="py-5 text-sm text-slate-500">Loading your note...</p>
      ) : (
        <>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={20000}
            rows={5}
            placeholder="Write your key points, questions, or revision notes..."
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{content.length}/20,000 characters</span>
            <div className="flex gap-2">
              {noteId !== null && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={15} /> Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !content.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                <Save size={15} /> {saving ? "Saving..." : noteId ? "Update Note" : "Save Note"}
              </button>
            </div>
          </div>
        </>
      )}
      {message && <p className="mt-3 text-sm font-medium text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </section>
  );
}
