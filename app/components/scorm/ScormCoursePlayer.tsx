"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, BookOpen, CheckCircle2, LoaderCircle, PlayCircle, X } from "lucide-react";
import { clearApiCache } from "@/lib/course-api";

type ScormPackage = {
  id: string;
  title: string;
  version: string;
  mastery_score: number | null;
  package_size: number;
};

type ScormAttempt = {
  id: string;
  attempt_number: number;
  cmi: Record<string, unknown>;
  completion_status: string;
  success_status: string;
  score_raw: number | null;
};

const configuredApiBase = process.env.NEXT_PUBLIC_API_URL;
const API_BASE = configuredApiBase
  ? (configuredApiBase.replace(/\/$/, "").endsWith("/api")
      ? configuredApiBase.replace(/\/$/, "")
      : configuredApiBase.replace(/\/$/, "") + "/api")
  : "/api";

function authHeaders(json = true): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function ScormCoursePlayer({ courseId }: { courseId: number }) {
  const [packages, setPackages] = useState<ScormPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePackage, setActivePackage] = useState<ScormPackage | null>(null);
  const [attempt, setAttempt] = useState<ScormAttempt | null>(null);
  const [launchUrl, setLaunchUrl] = useState("");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savedStatus, setSavedStatus] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const attemptRef = useRef<ScormAttempt | null>(null);
  const packageRef = useRef<ScormPackage | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    packageRef.current = activePackage;
  }, [activePackage]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/scorm/courses/${courseId}/packages`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.detail || "Could not load SCORM activities.");
        if (!cancelled) setPackages(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Could not load SCORM activities.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [courseId]);

  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      const data = event.data;
      const currentAttempt = attemptRef.current;
      const currentPackage = packageRef.current;
      if (
        event.origin !== "null" ||
        event.source !== iframeRef.current?.contentWindow ||
        !data ||
        data.type !== "lms-scorm-commit" ||
        !currentAttempt ||
        !currentPackage ||
        data.packageId !== currentPackage.id ||
        data.attemptId !== currentAttempt.id ||
        typeof data.cmi !== "object" ||
        data.cmi === null
      ) return;

      saveQueueRef.current = saveQueueRef.current.then(async () => {
        try {
          const response = await fetch(`${API_BASE}/scorm/attempts/commit`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              attempt_id: currentAttempt.id,
              cmi: data.cmi,
              finish: Boolean(data.finish),
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result?.detail || "Progress could not be saved.");
          const failed = result.success_status === "failed";
          setSavedStatus(failed ? "Attempt finished — not passed" : result.completed ? "Completion saved" : "Progress saved");
          setMessage(failed
            ? "Your attempt was saved, but the passing threshold was not met. You can launch the activity again to retry."
            : result.completed
              ? "Your SCORM completion has been saved."
              : "Your learning progress has been saved.");
          if (result.completed) {
            clearApiCache();
            window.dispatchEvent(new CustomEvent("lms-scorm-progress-updated", { detail: { courseId } }));
          }
        } catch (e: any) {
          setError(e?.message || "Progress could not be saved. Keep this page open and try again.");
        }
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function launch(item: ScormPackage) {
    setError("");
    setMessage("");
    setSavedStatus("");
    setLaunching(true);
    try {
      const startResponse = await fetch(`${API_BASE}/scorm/attempts/start`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ package_id: item.id }),
      });
      const startData = await startResponse.json();
      if (!startResponse.ok) throw new Error(startData?.detail || "Could not start SCORM attempt.");

      const ticketResponse = await fetch(
        `${API_BASE}/scorm/packages/${item.id}/launch-ticket?attempt_id=${encodeURIComponent(startData.attempt.id)}`,
        { method: "POST", headers: authHeaders(), credentials: "same-origin" }
      );
      const ticketData = await ticketResponse.json();
      if (!ticketResponse.ok) throw new Error(ticketData?.detail || "Could not prepare secure SCORM launch.");

      setActivePackage(item);
      setAttempt(startData.attempt);
      attemptRef.current = startData.attempt;
      packageRef.current = item;
      setLaunchUrl(ticketData.launch_url);
    } catch (e: any) {
      setError(e?.message || "Could not launch SCORM activity.");
    } finally {
      setLaunching(false);
    }
  }

  function closePlayer() {
    setLaunchUrl("");
    setActivePackage(null);
    setAttempt(null);
    attemptRef.current = null;
    packageRef.current = null;
  }

  if (loading && packages.length === 0) return null;
  if (!loading && packages.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <BookOpen size={20} className="text-amber-600" />
        <h2 className="text-lg font-bold text-slate-900">Interactive SCORM activities</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">Launch interactive training and save your progress to the LMS.</p>

      {error && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={17} />{error}</p>}
      {message && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17} />{message}</p>}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {packages.map((item) => (
          <div key={item.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">SCORM {item.version}{item.mastery_score !== null ? ` · Pass target ${item.mastery_score}%` : ""}</p>
            </div>
            <button type="button" onClick={() => void launch(item)} disabled={launching}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {launching ? <LoaderCircle size={16} className="animate-spin" /> : <PlayCircle size={16} />}
              {launching ? "Preparing activity…" : "Launch activity"}
            </button>
          </div>
        ))}
      </div>

      {launchUrl && activePackage && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/80 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label={activePackage.title}>
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{activePackage.title}</p>
                <p className="text-xs text-slate-500">Attempt {attempt?.attempt_number} · {savedStatus || "Progress saves when the activity commits data"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={closePlayer} aria-label="Close SCORM player" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                  <X size={19} />
                </button>
              </div>
            </div>
            <iframe
              ref={iframeRef}
              title={activePackage.title}
              src={launchUrl}
              sandbox="allow-scripts allow-forms allow-downloads allow-modals allow-popups allow-presentation"
              allow="fullscreen; autoplay; clipboard-read; clipboard-write"
              className="min-h-0 w-full flex-1 border-0 bg-white"
            />
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 sm:px-6">
              Close the activity after it has saved progress. If your course has a Finish or Exit button, use it before closing.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
