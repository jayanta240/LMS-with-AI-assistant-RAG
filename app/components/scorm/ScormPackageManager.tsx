"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { FileArchive, Upload, RefreshCw, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

type ScormPackage = {
  id: string;
  title: string;
  version: string;
  mastery_score: number | null;
  package_size: number;
  created_at?: string | null;
};

const configuredApiBase = process.env.NEXT_PUBLIC_API_URL;
const API_BASE = configuredApiBase
  ? (configuredApiBase.replace(/\/$/, "").endsWith("/api")
      ? configuredApiBase.replace(/\/$/, "")
      : configuredApiBase.replace(/\/$/, "") + "/api")
  : "/api";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ScormPackageManager({ courseId }: { courseId: number }) {
  const [packages, setPackages] = useState<ScormPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [canManage, setCanManage] = useState(false);

  async function loadPackages() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/scorm/courses/${courseId}/packages`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || "Could not load SCORM packages.");
      setPackages(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Could not load SCORM packages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const role = localStorage.getItem("role") || "";
    setCanManage(role === "company_admin" || role === "department_head");
    void loadPackages();
  }, [courseId]);

  async function uploadPackage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setNotice("");
    setError("");
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Choose a SCORM ZIP package.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API_BASE}/scorm/courses/${courseId}/packages`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || "SCORM upload failed.");
      setNotice(`“${data.package?.title || file.name}” was uploaded successfully.`);
      await loadPackages();
    } catch (e: any) {
      setError(e?.message || "SCORM upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function deletePackage(item: ScormPackage) {
    const confirmed = window.confirm(`Delete “${item.title}” and its learner attempts? This cannot be undone.`);
    if (!confirmed) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/scorm/packages/${item.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || "Could not delete SCORM package.");
      setNotice(`“${item.title}” was deleted.`);
      await loadPackages();
    } catch (e: any) {
      setError(e?.message || "Could not delete SCORM package.");
    }
  }

  function formatBytes(value: number) {
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <FileArchive size={20} className="text-amber-600" />
            <h2 className="text-lg font-bold">SCORM learning packages</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Upload and manage standards-based interactive learning content.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void loadPackages()} disabled={loading || uploading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={15} /> Refresh
          </button>
          {canManage && (
            <label className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
              <Upload size={16} /> {uploading ? "Uploading…" : "Upload SCORM ZIP"}
              <input type="file" accept=".zip,application/zip" className="hidden" disabled={uploading} onChange={uploadPackage} />
            </label>
          )}
        </div>
      </div>

      {notice && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17} />{notice}</p>}
      {error && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle size={17} />{error}</p>}

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Loading SCORM packages…</p>
      ) : packages.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <FileArchive size={28} className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No SCORM packages added</p>
          <p className="mt-1 text-xs text-slate-500">{canManage ? "Upload a valid SCORM 1.2 ZIP to add interactive learning content to this course." : "Your administrator has not added a SCORM activity to this course yet."}</p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {packages.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-50 p-2 text-amber-700"><FileArchive size={20} /></div>
                <div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">SCORM {item.version} · {formatBytes(item.package_size)}{item.mastery_score !== null ? ` · Mastery score ${item.mastery_score}%` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ready for learners</span>
                {canManage && (
                  <button type="button" onClick={() => void deletePackage(item)} aria-label={`Delete ${item.title}`}
                    className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50" title="Delete package and attempts">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
