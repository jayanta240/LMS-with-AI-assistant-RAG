"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Building2, ChevronDown, Filter, RotateCcw } from "lucide-react";
import { getCompanies, getDepartments, getUsers, getCourses } from "@/lib/course-api";

type Company = { id: number; company_name: string };
type Department = { id: number; department_name: string };
type Option = { id: number; name?: string; title?: string; employee_name?: string; employee_id?: string; email?: string };

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

export default function ReportSettings({ role }: { role: string }) {
  const [userCompanyId, setUserCompanyId] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<Option[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [scope, setScope] = useState<"company" | "department">("company");
  const [departmentId, setDepartmentId] = useState("");
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const canLoadFilters = role === "super_admin" || role === "company_admin" || role === "department_head";
  const activeFilters = useMemo(
    () => [userId, courseId, startDate, endDate, role === "super_admin" ? companyId : "", role === "company_admin" && scope === "department" ? departmentId : ""].filter(Boolean).length,
    [userId, courseId, startDate, endDate, companyId, role, scope, departmentId]
  );

  useEffect(() => {
    setUserCompanyId(Number(localStorage.getItem("company_id") || 0));
  }, []);

  useEffect(() => {
    if (role !== "super_admin") return;
    getCompanies()
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load companies."));
  }, [role]);

  const effectiveCompanyId = role === "super_admin" ? Number(companyId || 0) : userCompanyId;

  useEffect(() => {
    if (!canLoadFilters || !effectiveCompanyId) {
      setDepartments([]);
      if (role === "super_admin") setDepartmentId("");
      return;
    }
    let cancelled = false;
    setLoadingOptions(true);
    getDepartments(effectiveCompanyId)
      .then((data) => {
        if (!cancelled) setDepartments(Array.isArray(data) ? data : []);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load departments."); })
      .finally(() => { if (!cancelled) setLoadingOptions(false); });
    return () => { cancelled = true; };
  }, [canLoadFilters, effectiveCompanyId, role]);

  useEffect(() => {
    if (!canLoadFilters) return;
    let cancelled = false;
    Promise.all([getUsers(), getCourses()])
      .then(([userData, courseData]) => {
        if (!cancelled) {
          setUsers(Array.isArray(userData) ? userData : []);
          setCourses(Array.isArray(courseData) ? courseData : []);
        }
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load report filters."); });
    return () => { cancelled = true; };
  }, [canLoadFilters]);

  function resetFilters() {
    setUserId("");
    setCourseId("");
    setStartDate("");
    setEndDate("");
    setDepartmentId("");
    if (role === "super_admin") setCompanyId("");
    if (role === "company_admin") setScope("company");
    setError("");
  }

  async function downloadReport() {
    setError("");
    if (startDate && endDate && startDate > endDate) {
      setError("Start date must be before or equal to end date.");
      return;
    }
    if (role === "company_admin" && scope === "department" && !departmentId) {
      setError("Please select a department.");
      return;
    }
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (role === "super_admin" && companyId) params.set("company_id", companyId);
      if (role === "super_admin" && departmentId) params.set("department_id", departmentId);
      if (role === "company_admin") {
        params.set("scope", scope);
        if (scope === "department") params.set("department_id", departmentId);
      }
      if (userId) params.set("user_id", userId);
      if (courseId) params.set("course_id", courseId);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/reports/download?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || "Report download failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "lms_learning_report.csv";
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
        <FileSpreadsheet size={16} /> Report
        {activeFilters > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px]">{activeFilters}</span>}
        <ChevronDown size={15} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {expanded && (
        <>
          <button aria-label="Close report options" className="fixed inset-0 z-30 cursor-default" onClick={() => setExpanded(false)} />
          <div role="dialog" aria-label="Custom learning report filters" className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Filter size={16} /></span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Custom learning report</p>
                <p className="text-xs text-slate-500">Choose filters or leave them as All</p>
              </div>
            </div>

            {role === "super_admin" && (
              <div className="mb-3">
                <label htmlFor="report-company" className="mb-1 block text-xs font-medium text-slate-600">Company</label>
                <select id="report-company" value={companyId} onChange={(event) => { setCompanyId(event.target.value); setDepartmentId(""); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <option value="">All companies</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.company_name}</option>)}
                </select>
              </div>
            )}

            {role === "company_admin" && (
              <div className="mb-3">
                <label htmlFor="report-scope" className="mb-1 block text-xs font-medium text-slate-600">Report scope</label>
                <select id="report-scope" value={scope} onChange={(event) => { setScope(event.target.value as "company" | "department"); setDepartmentId(""); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <option value="company">Whole company</option>
                  <option value="department">Department-wise</option>
                </select>
              </div>
            )}

            {(role === "super_admin" ? Boolean(companyId) : role === "company_admin" && scope === "department") && (
              <div className="mb-3">
                <label htmlFor="report-department" className="mb-1 block text-xs font-medium text-slate-600">Department</label>
                <select id="report-department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={loadingOptions || departments.length === 0} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60">
                  <option value="">{loadingOptions ? "Loading departments..." : "All departments"}</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.department_name}</option>)}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="report-user" className="mb-1 block text-xs font-medium text-slate-600">Employee</label>
              <select id="report-user" value={userId} onChange={(event) => setUserId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <option value="">All employees</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.employee_name || user.name || user.employee_id || user.email || `Employee #${user.id}`}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label htmlFor="report-course" className="mb-1 block text-xs font-medium text-slate-600">Course</label>
              <select id="report-course" value={courseId} onChange={(event) => setCourseId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <option value="">All courses</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title || course.name || `Course #${course.id}`}</option>)}
              </select>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="report-start-date" className="mb-1 block text-xs font-medium text-slate-600">From date</label>
                <input id="report-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700" />
              </div>
              <div>
                <label htmlFor="report-end-date" className="mb-1 block text-xs font-medium text-slate-600">To date</label>
                <input id="report-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700" />
              </div>
            </div>

            {role === "department_head" && (
              <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><Building2 size={14} className="mr-1 inline" />Report is limited to your assigned department.</p>
            )}

            {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

            <div className="flex gap-2">
              <button type="button" onClick={resetFilters} disabled={downloading} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RotateCcw size={14} /> Reset</button>
              <button type="button" onClick={downloadReport} disabled={downloading || (role === "company_admin" && scope === "department" && (!departmentId || loadingOptions))} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">
                <Download size={16} /> {downloading ? "Preparing report..." : "Download CSV"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
