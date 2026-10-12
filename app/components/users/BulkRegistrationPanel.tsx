"use client";

import { useState } from "react";
import { clearApiCache } from "@/lib/course-api";
import { Download, FileSpreadsheet, Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type FailedRow = { row: number; email?: string; reason: string };
type CreatedRow = { row: number; name: string; email: string; employee_id?: string; user_id?: number };

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

export default function BulkRegistrationPanel({ kind }: { kind: "employee" | "department_head" }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ created_count: number; failed_count: number; created: CreatedRow[]; failed: FailedRow[] } | null>(null);

  const label = kind === "employee" ? "Employees" : "Department Heads";
  const endpoint = kind === "employee" ? "employees" : "department-heads";

  async function downloadTemplate() {
    setError("");
    setTemplateBusy(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/api/bulk-registration/template?role=${kind}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || "Could not download template.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = kind === "employee" ? "employee_bulk_upload_template.xlsx" : "department_head_bulk_upload_template.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download template.");
    } finally {
      setTemplateBusy(false);
    }
  }

  async function uploadFile() {
    if (!file) {
      setError("Choose an Excel .xlsx file first.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Please upload an Excel .xlsx file. Download the template if needed.");
      return;
    }
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/api/bulk-registration/${endpoint}`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || "Bulk registration failed.");
      setResult(data);
      clearApiCache();
      setFile(null);
      const input = document.getElementById(`bulk-${kind}-file`) as HTMLInputElement | null;
      if (input) input.value = "";
      window.dispatchEvent(new CustomEvent("lms-bulk-registration-complete", { detail: { kind, data } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Bulk Upload {label}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Register multiple {kind === "employee" ? "employees" : "department heads"} from one Excel spreadsheet instead of filling each form individually.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => { setOpen((v) => !v); setError(""); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          {open ? <X size={16} /> : <Upload size={16} />}
          {open ? "Close bulk upload" : "Upload Excel"}
        </button>
      </div>

      {open && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">1. Download the Excel template</p>
            <p className="mt-1 text-sm text-slate-500">Keep the column headings unchanged and fill one person per row. Passwords must be at least 8 characters.</p>
            <button type="button" onClick={downloadTemplate} disabled={templateBusy} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60">
              {templateBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download .xlsx template
            </button>
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-800">2. Upload completed spreadsheet</p>
            <label htmlFor={`bulk-${kind}-file`} className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-5 py-7 text-center transition hover:border-emerald-400 hover:bg-emerald-50/30">
              <FileSpreadsheet size={28} className="text-emerald-700" />
              <span className="mt-2 text-sm font-semibold text-slate-800">{file?.name || "Choose an Excel .xlsx file"}</span>
              <span className="mt-1 text-xs text-slate-500">Maximum 500 records per upload</span>
              <input id={`bulk-${kind}-file`} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); setError(""); }} />
            </label>
            <button type="button" onClick={uploadFile} disabled={busy || !file} className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {busy ? "Registering records..." : `Register ${label}`}
            </button>
          </div>

          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {result && (
            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={17} /> Created: {result.created_count}</span>
                <span className={`inline-flex items-center gap-2 text-sm font-semibold ${result.failed_count ? "text-red-700" : "text-slate-500"}`}>
                  {result.failed_count ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />} Failed: {result.failed_count}
                </span>
              </div>
              {result.failed.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-800">Rows that need correction</p>
                  <div className="mt-2 max-h-64 space-y-2 overflow-auto">
                    {result.failed.map((item, index) => (
                      <div key={`${item.row}-${index}`} className="rounded-lg bg-red-50 px-3 py-2 text-sm">
                        <p className="font-semibold text-red-800">Excel row {item.row}{item.email ? ` · ${item.email}` : ""}</p>
                        <p className="mt-0.5 text-red-700">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.created.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-700">View created records ({result.created.length})</summary>
                  <div className="mt-2 max-h-48 overflow-auto text-sm text-slate-600">
                    {result.created.map((item, index) => <p key={`${item.row}-${index}`} className="border-b border-slate-100 py-1.5">Row {item.row}: {item.name} · {item.email}{item.employee_id ? ` · ID: ${item.employee_id}` : ""}</p>)}
                  </div>
                </details>
              )}
              <p className="mt-3 text-xs text-slate-500">Successful rows are saved even if another row fails. Correct failed rows in Excel and upload them again.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
