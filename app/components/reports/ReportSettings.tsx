"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Building2, Users, ChevronDown } from "lucide-react";
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
    setError("");
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
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report download failed.");
    } finally {
      setDownloading(false);
    }
  }

  if (!["super_admin", "company_admin", "department_head"].includes(role)) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setExpanded((value) => !value); setError(""); }}
        aria-expanded={expanded}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        <FileSpreadsheet size={16} />
        Report
        <ChevronDown size={15} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {expanded && (
        <>
          <button aria-label="Close report options" className="fixed inset-0 z-30 cursor-default" onClick={() => setExpanded(false)} />
          <div role="dialog" aria-label="Report download options" className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><FileSpreadsheet size={16} /></span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Learning report</p>
                <p className="text-xs text-slate-500">Download activity as CSV</p>
              </div>
            </div>

            {role === "super_admin" && (
              <div className="mb-3">
                <label htmlFor="report-company" className="mb-1 block text-xs font-medium text-slate-600">Company</label>
                <select id="report-company" value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400">
                  <option value="">All companies</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.company_name}</option>)}
                </select>
              </div>
            )}

            {role === "company_admin" && (
              <div className="mb-3">
                <label htmlFor="report-scope" className="mb-1 block text-xs font-medium text-slate-600">Report scope</label>
                <select id="report-scope" value={scope} onChange={(event) => setScope(event.target.value as "company" | "department")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400">
                  <option value="company">Whole company</option>
                  <option value="department">Department-wise</option>
                </select>
                {scope === "department" && (
                  <div className="mt-3">
                    <label htmlFor="report-department" className="mb-1 block text-xs font-medium text-slate-600">Department</label>
                    <select id="report-department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={loadingOptions || departments.length === 0} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400 disabled:opacity-60">
                      {departments.length === 0 && <option value="">{loadingOptions ? "Loading departments..." : "No departments available"}</option>}
                      {departments.map((department) => <option key={department.id} value={department.id}>{department.department_name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {role === "department_head" && (
              <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><Building2 size={14} className="mr-1 inline" />Report is limited to your assigned department.</p>
            )}

            {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

            <button type="button" onClick={downloadReport} disabled={downloading || (role === "company_admin" && scope === "department" && (loadingOptions || !departmentId))} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">
              <Download size={16} />
              {downloading ? "Preparing report..." : "Download CSV"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
