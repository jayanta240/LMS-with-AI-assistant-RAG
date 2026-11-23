"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getCourses, getSurveys, createSurvey, submitSurveyResponse, getSurveyResults, setSurveyActive } from "@/lib/course-api";
import { ClipboardList, Plus, MessageSquareText, BarChart3, CheckCircle2 } from "lucide-react";

type QuestionType = "text" | "rating" | "choice";
type Question = { id: string; prompt: string; type: QuestionType; options?: string[] };
type Survey = { id: number; course_id: number; course_title: string; title: string; description: string; questions: Question[]; is_active?: boolean; submitted?: boolean; response_count?: number };

export default function SurveysPage() {
  const [role, setRole] = useState("");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([{ id: "1", prompt: "", type: "rating" }]);
  const [answers, setAnswers] = useState<Record<number, Record<string, string>>>({});
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getSurveys();
      setSurveys(data);
      if (localStorage.getItem("role") === "company_admin") {
        setCourses(await getCourses());
      }
    } catch (e: any) {
      setError(e?.message || "Unable to load surveys.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const currentRole = localStorage.getItem("role") || "";
    setRole(currentRole);
    load();
  }, []);

  function updateQuestion(index: number, patch: Partial<Question>) {
    setQuestions(current => current.map((question, i) => i === index ? { ...question, ...patch } : question));
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const normalized = questions.map(q => ({
        ...q,
        prompt: q.prompt.trim(),
        ...(q.type === "choice" ? { options: (q.options || []).filter(Boolean) } : {}),
      }));
      await createSurvey({ course_id: Number(courseId), title, description, questions: normalized });
      setTitle("");
      setDescription("");
      setCourseId("");
      setQuestions([{ id: "1", prompt: "", type: "rating" }]);
      setShowCreate(false);
      setSuccess("Survey created and made available to enrolled learners.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Unable to create survey.");
    }
  }

  async function handleSubmit(survey: Survey) {
    setError("");
    setSuccess("");
    try {
      const surveyAnswers = survey.questions.map(question => ({
        question_id: question.id,
        answer: answers[survey.id]?.[question.id] || "",
      }));
      await submitSurveyResponse(survey.id, surveyAnswers);
      setSuccess("Thank you. Your feedback has been submitted.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Unable to submit feedback.");
    }
  }

  async function openResults(surveyId: number) {
    setError("");
    try {
      setResults(await getSurveyResults(surveyId));
    } catch (e: any) {
      setError(e?.message || "Unable to load survey results.");
    }
  }

  async function toggleSurvey(survey: Survey) {
    try {
      await setSurveyActive(survey.id, !survey.is_active);
      await load();
    } catch (e: any) {
      setError(e?.message || "Unable to update survey.");
    }
  }

  const isAdmin = role === "company_admin";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600"><ClipboardList size={17} /> Learner feedback</div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Course Surveys</h1>
            <p className="mt-1 text-sm text-slate-500">{isAdmin ? "Create course evaluations and review learner responses." : "Share feedback on the courses assigned to you."}</p>
          </div>
          {isAdmin && <button onClick={() => setShowCreate(v => !v)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"><Plus size={17} /> Create Survey</button>}
        </div>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {showCreate && isAdmin && (
          <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">New course survey</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Course
                <select required value={courseId} onChange={e => setCourseId(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3">
                  <option value="">Select a course</option>
                  {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">Survey title
                <input required minLength={3} maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="Course feedback" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3" />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">Description
              <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 p-3" placeholder="Tell learners what this survey is about." />
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-800">Questions</h3><button type="button" onClick={() => setQuestions(q => [...q, { id: String(Date.now()), prompt: "", type: "text" }])} className="text-sm font-semibold text-amber-700">+ Add question</button></div>
              {questions.map((question, index) => <div key={question.id} className="grid gap-3 rounded-xl border border-slate-100 p-4 md:grid-cols-[1fr_170px]">
                <div className="space-y-2">
                  <input required value={question.prompt} onChange={e => updateQuestion(index, { prompt: e.target.value })} placeholder={`Question ${index + 1}`} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                  {question.type === "choice" && <input required value={(question.options || []).join(", ")} onChange={e => updateQuestion(index, { options: e.target.value.split(",").map(v => v.trim()) })} placeholder="Options separated by commas" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />}
                </div>
                <div className="flex gap-2">
                  <select value={question.type} onChange={e => updateQuestion(index, { type: e.target.value as QuestionType, options: e.target.value === "choice" ? ["Yes", "No"] : undefined })} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm">
                    <option value="rating">Rating (1–5)</option><option value="text">Text answer</option><option value="choice">Multiple choice</option>
                  </select>
                  {questions.length > 1 && <button type="button" onClick={() => setQuestions(q => q.filter((_, i) => i !== index))} className="text-sm text-red-600">Remove</button>}
                </div>
              </div>)}
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white">Publish survey</button></div>
          </form>
        )}

        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading surveys…</div> : surveys.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><MessageSquareText className="mx-auto text-slate-300" size={34} /><p className="mt-3 font-semibold text-slate-800">No surveys available</p><p className="mt-1 text-sm text-slate-500">{isAdmin ? "Create a survey for one of your courses." : "There are no active surveys for your assigned courses."}</p></div> : (
          <div className="grid gap-4 md:grid-cols-2">
            {surveys.map(survey => <section key={survey.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{survey.course_title}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{survey.title}</h2><p className="mt-1 text-sm text-slate-500">{survey.description}</p></div>{isAdmin ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${survey.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{survey.is_active ? "Active" : "Closed"}</span> : survey.submitted ? <CheckCircle2 className="shrink-0 text-emerald-600" /> : null}</div>
              {isAdmin ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-sm text-slate-500">{survey.response_count || 0} responses</span><div className="flex gap-3"><button onClick={() => openResults(survey.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700"><BarChart3 size={15} /> Results</button><button onClick={() => toggleSurvey(survey)} className="text-sm font-semibold text-amber-700">{survey.is_active ? "Close survey" : "Reopen survey"}</button></div></div> : survey.submitted ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Feedback submitted. Thank you!</p> : <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">{survey.questions.map(question => <label key={question.id} className="block text-sm font-medium text-slate-700">{question.prompt}{question.type === "rating" ? <select value={answers[survey.id]?.[question.id] || ""} onChange={e => setAnswers(a => ({ ...a, [survey.id]: { ...a[survey.id], [question.id]: e.target.value } }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3"><option value="">Choose rating</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} - {["","Poor","Fair","Good","Very good","Excellent"][n]}</option>)}</select> : question.type === "choice" ? <select value={answers[survey.id]?.[question.id] || ""} onChange={e => setAnswers(a => ({ ...a, [survey.id]: { ...a[survey.id], [question.id]: e.target.value } }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3"><option value="">Select an option</option>{(question.options || []).map(option => <option key={option} value={option}>{option}</option>)}</select> : <textarea rows={2} value={answers[survey.id]?.[question.id] || ""} onChange={e => setAnswers(a => ({ ...a, [survey.id]: { ...a[survey.id], [question.id]: e.target.value } }))} className="mt-2 w-full rounded-lg border border-slate-200 p-3" />}</label>)}<button onClick={() => handleSubmit(survey)} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Submit feedback</button></div>}
            </section>)}
          </div>
        )}

        {results && <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">{results.title} — Results</h2><p className="text-sm text-slate-500">{results.course_title} · {results.responses.length} responses</p></div><button onClick={() => setResults(null)} className="text-sm font-semibold text-slate-500">Close</button></div><div className="mt-4 space-y-4">{results.responses.map((response: any, index: number) => <div key={index} className="rounded-xl border border-slate-100 p-4"><p className="text-sm font-semibold text-slate-800">{response.learner_name || response.learner_email || "Learner"} <span className="font-normal text-slate-400">· {response.submitted_at ? new Date(response.submitted_at).toLocaleString() : ""}</span></p><div className="mt-3 space-y-2">{results.questions.map((question: Question) => <p key={question.id} className="text-sm text-slate-600"><span className="font-medium text-slate-800">{question.prompt}</span>: {response.answers?.[question.id] || "—"}</p>)}</div></div>)}</div></div>}
      </div>
    </DashboardLayout>
  );
}
