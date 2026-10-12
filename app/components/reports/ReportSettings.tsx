"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Building2, Users } from "lucide-react";
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Report Settings</h2>
            <p className="mt-1 text-sm text-slate-500">
              Download employee, course assignment, completion, and learning-time data as a CSV report.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={downloadReport}
          disabled={downloading || (role === "company_admin" && scope === "department" && loadingOptions)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={16} />
          {downloading ? "Preparing report..." : "Download CSV"}
        </button>
      </div>

      {role === "super_admin" && (
        <div className="mt-5 max-w-xl">
          <label htmlFor="report-company" className="mb-2 block text-sm font-medium text-slate-700">
            Company
          </label>
          <select
            id="report-company"
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          >
            <option value="">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.company_name}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">Choose a company or leave “All companies” selected for the platform-wide report.</p>
        </div>
      )}

      {role === "company_admin" && (
        <div className="mt-5 space-y-4">
          <p className="text-sm font-medium text-slate-700">Report scope</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setScope("company")}
              aria-pressed={scope === "company"}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${scope === "company" ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}
            >
              <Building2 size={20} className="shrink-0 text-amber-600" />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Whole Company</span>
                <span className="mt-1 block text-xs text-slate-500">All departments in your company</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setScope("department")}
              aria-pressed={scope === "department"}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${scope === "department" ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}
            >
              <Users size={20} className="shrink-0 text-amber-600" />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Department-wise</span>
                <span className="mt-1 block text-xs text-slate-500">Choose one department</span>
              </span>
            </button>
          </div>
          {scope === "department" && (
            <div className="max-w-xl">
              <label htmlFor="report-department" className="mb-2 block text-sm font-medium text-slate-700">Department</label>
              <select
                id="report-department"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                disabled={loadingOptions || departments.length === 0}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-60"
              >
                {departments.length === 0 && <option value="">{loadingOptions ? "Loading departments..." : "No departments available"}</option>}
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.department_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {role === "department_head" && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Your assigned department</p>
          <p className="mt-1 text-sm text-slate-500">The report is automatically limited to your department. No department selector is needed.</p>
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
