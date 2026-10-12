"use client";

import { useState } from "react";
import { Loader2, Plus, X, Image as ImageIcon } from "lucide-react";
import { createCourse } from "@/lib/course-api";

type Props = {
  onCreated: () => void;
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 disabled:bg-slate-50";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700">{children}</label>;
}

export default function CreateCourseDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [level, setLevel] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState("");
  const [courseType, setCourseType] = useState("online");
  const [visibility, setVisibility] = useState("private");
  const [tags, setTags] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setTitle("");
    setDescription("");
    setThumbnailUrl("");
    setCategory("");
    setSubCategory("");
    setLevel("");
    setCourseCode("");
    setLanguage("English");
    setDuration("");
    setCourseType("online");
    setVisibility("private");
    setTags("");
    setOutcomes("");
    setReleaseDate(new Date().toISOString().slice(0, 10));
    setExpiryEnabled(false);
    setExpiryDate("");
    setStatus("draft");
    setError("");
  }

  async function handleCreate() {
    if (creating || !title.trim() || !description.trim()) return;
    if (expiryEnabled && expiryDate && releaseDate && expiryDate < releaseDate) {
      setError("Expiry date must be on or after the release date.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      await createCourse(title.trim(), description.trim(), thumbnailUrl.trim(), {
        category: category.trim() || null,
        sub_category: subCategory.trim() || null,
        level: level || null,
        course_code: courseCode.trim() || null,
        language: language || null,
        duration: duration.trim() || null,
        course_type: courseType,
        visibility,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        learning_outcomes: outcomes.split("\n").map((item) => item.trim()).filter(Boolean),
        release_date: releaseDate || null,
        expiry_date: expiryEnabled ? expiryDate || null : null,
        status,
      });
      resetForm();
      setOpen(false);
      onCreated();
    } catch (err: any) {
      console.error("Create course error:", err);
      setError(err?.message || "Failed to create course.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(""); setOpen(true); }}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition hover:opacity-90"
        style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-text)" }}
      >
        <Plus size={17} />
        Add New Course
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6">
          <div className="my-3 w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:my-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 via-white to-white px-5 py-5 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Course builder</p>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Add New Course</h2>
                <p className="mt-1 text-sm text-slate-500">Add course details and publishing settings. Lessons can be added after creation.</p>
              </div>
              <button type="button" aria-label="Close course builder" disabled={creating} onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X size={19} />
              </button>
            </div>

            <div className="border-b border-slate-100 px-5 py-4 sm:px-8">
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Course creation sections">
                {([
                  ["1", "Basic Information", "course-basic"],
                  ["2", "Content Structure", "course-content"],
                  ["3", "Additional Settings", "course-settings"],
                  ["4", "Review & Publish", "course-publish"],
                ] as const).map(([number, label, target], index) => (
                  <li key={target}>
                    <button type="button" onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="group flex w-full items-center gap-2 text-left">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${index === 0 ? "border-amber-400 bg-amber-400 text-white" : "border-slate-200 bg-slate-50 text-slate-500 group-hover:border-amber-300"}`}>{number}</span>
                      <span className={`text-xs font-semibold sm:text-sm ${index === 0 ? "text-amber-700" : "text-slate-500 group-hover:text-slate-800"}`}>{label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-5 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_290px]">
              <div className="space-y-6">
                <section id="course-basic" className="scroll-mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <div className="mb-5">
                    <h3 className="font-semibold text-slate-900">1. Basic Information</h3>
                    <p className="mt-1 text-xs text-slate-500">The essentials learners will see in the course library.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <FieldLabel>Course Title *</FieldLabel>
                      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Enter course title" disabled={creating} className={fieldClass} required />
                      <p className="mt-1 text-right text-xs text-slate-400">{title.length}/150</p>
                    </div>
                    <div>
                      <FieldLabel>Course Description *</FieldLabel>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} placeholder="What will learners learn in this course?" disabled={creating} className={fieldClass} required />
                      <p className="mt-1 text-right text-xs text-slate-400">{description.length}/2000</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><FieldLabel>Category</FieldLabel><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Health & Safety" disabled={creating} className={fieldClass} /></div>
                      <div><FieldLabel>Sub Category</FieldLabel><input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="e.g. Workplace Safety" disabled={creating} className={fieldClass} /></div>
                      <div><FieldLabel>Level</FieldLabel><select value={level} onChange={(e) => setLevel(e.target.value)} disabled={creating} className={fieldClass}><option value="">Select level</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
                      <div><FieldLabel>Course Code <span className="font-normal text-slate-400">(optional)</span></FieldLabel><input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. SAFE-101" disabled={creating} className={fieldClass} /></div>
                      <div><FieldLabel>Language</FieldLabel><select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={creating} className={fieldClass}><option>English</option><option>Hindi</option><option>Bengali</option><option>Other</option></select></div>
                      <div><FieldLabel>Duration</FieldLabel><input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2h 30m" disabled={creating} className={fieldClass} /></div>
                    </div>
                  </div>
                </section>

                <section id="course-content" className="scroll-mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <h3 className="font-semibold text-slate-900">2. Content Structure · Learning Outcomes & Tags</h3>
                  <p className="mt-1 text-xs text-slate-500">Add clear outcomes, one per line, and searchable tags separated by commas.</p>
                  <div className="mt-4">
                    <FieldLabel>What will learners learn?</FieldLabel>
                    <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={3} placeholder={"Understand key concepts\nApply the process in practice\nEvaluate real-world scenarios"} disabled={creating} className={fieldClass} />
                  </div>
                  <div className="mt-4"><FieldLabel>Tags</FieldLabel><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Workplace Safety, Compliance, Training" disabled={creating} className={fieldClass} /></div>
                </section>

                <section id="course-settings" className="scroll-mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <h3 className="font-semibold text-slate-900">3. Additional Settings · Thumbnail & Preview</h3>
                  <p className="mt-1 text-xs text-slate-500">Paste a publicly accessible image URL for the course card.</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]">
                    <div><FieldLabel>Thumbnail URL</FieldLabel><input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://example.com/course.jpg" disabled={creating} className={fieldClass} /><p className="mt-2 text-xs text-slate-400">Image uploads can be added in a later iteration.</p></div>
                    <div className="flex min-h-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                      {thumbnailUrl.trim() ? <img src={thumbnailUrl} alt="Course thumbnail preview" className="h-full min-h-28 w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <div className="text-center text-slate-400"><ImageIcon size={25} className="mx-auto" /><span className="mt-2 block text-xs">Preview</span></div>}
                    </div>
                  </div>
                </section>
              </div>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">Course Type</h3>
                  <div className="mt-3 space-y-2">
                    {([["online", "Online Course", "Self-paced learning content"], ["instructor_led", "Instructor Led", "Live sessions with an instructor"], ["blended", "Blended Course", "Online and live sessions"]] as const).map(([value, label, help]) => (
                      <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${courseType === value ? "border-amber-300 bg-amber-50/70" : "border-slate-200 hover:border-slate-300"}`}>
                        <input type="radio" name="courseType" value={value} checked={courseType === value} onChange={() => setCourseType(value)} disabled={creating} className="mt-1 accent-amber-500" />
                        <span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{help}</span></span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">Course Visibility</h3>
                  <div className="mt-3 space-y-2">
                    {([["private", "Private", "Only assigned learners can access"], ["organization", "Organization", "People in your organization"], ["public", "Public Catalog", "Visible in the public catalog"]] as const).map(([value, label, help]) => (
                      <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${visibility === value ? "border-amber-300 bg-amber-50/70" : "border-slate-200 hover:border-slate-300"}`}>
                        <input type="radio" name="visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} disabled={creating} className="mt-1 accent-amber-500" />
                        <span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{help}</span></span>
                      </label>
                    ))}
                  </div>
                </section>

                <section id="course-publish" className="scroll-mt-6 rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">4. Review & Publish · Publish Settings</h3>
                  <div className="mt-4"><FieldLabel>Initial Status</FieldLabel><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={creating} className={fieldClass}><option value="draft">Save as Draft</option><option value="published">Publish Course</option></select></div>
                  <div className="mt-4"><FieldLabel>Release Date</FieldLabel><input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} disabled={creating} className={fieldClass} /></div>
                  <label className="mt-4 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={expiryEnabled} onChange={(e) => setExpiryEnabled(e.target.checked)} disabled={creating} className="accent-amber-500" />Set expiry date</label>
                  {expiryEnabled && <div className="mt-3"><FieldLabel>Expiry Date</FieldLabel><input type="date" min={releaseDate || undefined} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} disabled={creating} className={fieldClass} /></div>}
                </section>
              </aside>
            </div>

            {error && <div role="alert" className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-8">{error}</div>}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-xs text-slate-500">You can manage lessons and course content after creation.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { if (!creating) { setOpen(false); setError(""); } }} disabled={creating} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">Cancel</button>
                <button type="button" onClick={handleCreate} disabled={creating || !title.trim() || !description.trim()} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-text)" }}>
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  {creating ? "Saving Course..." : status === "published" ? "Publish Course" : "Save as Draft"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
