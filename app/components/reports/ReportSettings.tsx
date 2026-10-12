"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Building2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { getCompanies, getDepartments } from "@/lib/course-api";

type Company = { id: number; company_name: string };
type Department = { id: number; department_name: string };

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

export default function ReportSettings({ role }: { role: string }) {
  const [userCompanyId, setUserCompanyId] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [scope, setScope] = useState<"company" | "department">("company");
  const [departmentId, setDepartmentId] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setUserCompanyId(Number(localStorage.getItem("company_id") || 0));
  }, []);

  useEffect(() => {
    if (role !== "super_admin") return;
    getCompanies()
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load companies."));
  }, [role]);

  useEffect(() => {
    if (role !== "company_admin" || scope !== "department" || !userCompanyId) {
      setDepartments([]);
      setDepartmentId("");
      return;
    }
    let cancelled = false;
    setLoadingOptions(true);
    getDepartments(userCompanyId)
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setDepartments(list);
          setDepartmentId(list.length ? String(list[0].id) : "");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load departments.");
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => { cancelled = true; };
  }, [role, scope, userCompanyId]);

  async function downloadReport() {
    setError("");
    if (role === "company_admin" && scope === "department" && !departmentId) {
      setError("Please select a department.");
      return;
    }
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (role === "super_admin" && companyId) params.set("company_id", companyId);
      if (role === "company_admin") {
        params.set("scope", scope);
        if (scope === "department") params.set("department_id", departmentId);
      }
      // Department-head scope is derived entirely from the authenticated token.
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/api/reports/download?${params.toString()}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || "Report download failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "lms_report.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report download failed.");
    } finally {
      setDownloading(false);
    }
  }

  if (!["super_admin", "company_admin", "department_head"].includes(role)) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><FileSpreadsheet size={18} /></span>
          <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">Learning Report</span><span className="block text-xs text-slate-500">Export learning activity as CSV</span></span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-amber-600">Report options {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      {expanded && (
        <div className="space-y-4 border-t border-slate-100 p-4">
          {role === "super_admin" && <div><label htmlFor="report-company" className="mb-1.5 block text-sm font-medium text-slate-700">Company</label><select id="report-company" value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400"><option value="">All companies</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.company_name}</option>)}</select></div>}
          {role === "company_admin" && <div className="space-y-3"><p className="text-sm font-medium text-slate-700">Report scope</p><div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setScope("company")} aria-pressed={scope === "company"} className={`flex items-center gap-2 rounded-lg border p-3 text-left transition ${scope === "company" ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}><Building2 size={18} className="shrink-0 text-amber-600" /><span><span className="block text-sm font-semibold text-slate-800">Whole Company</span><span className="block text-xs text-slate-500">All departments</span></span></button>
            <button type="button" onClick={() => setScope("department")} aria-pressed={scope === "department"} className={`flex items-center gap-2 rounded-lg border p-3 text-left transition ${scope === "department" ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}><Users size={18} className="shrink-0 text-amber-600" /><span><span className="block text-sm font-semibold text-slate-800">Department-wise</span><span className="block text-xs text-slate-500">Choose a department</span></span></button>
          </div>{scope === "department" && <div><label htmlFor="report-department" className="mb-1.5 block text-sm font-medium text-slate-700">Department</label><select id="report-department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={loadingOptions || departments.length === 0} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400 disabled:opacity-60">{departments.length === 0 && <option value="">{loadingOptions ? "Loading departments..." : "No departments available"}</option>}{departments.map((department) => <option key={department.id} value={department.id}>{department.department_name}</option>)}</select></div>}</div>}
          {role === "department_head" && <p className="text-sm text-slate-600">The report will include only your assigned department.</p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end"><button type="button" onClick={downloadReport} disabled={downloading || (role === "company_admin" && scope === "department" && loadingOptions)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"><Download size={16} />{downloading ? "Preparing report..." : "Download CSV"}</button></div>
        </div>
      )}
    </section>
  );
}
