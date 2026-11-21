"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/common/PageHeader";
import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";
import { getUsers, getCourses, submitCourseAssignmentRequest } from "@/lib/course-api";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id?: number | null;
  department?: string | null;
};

type Course = { id: number; title: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [userData, courseData] = await Promise.all([getUsers(), getCourses()]);
      setUsers(Array.isArray(userData) ? userData.filter((u: User) => u.role === "employee") : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
    } catch (e) {
      console.error("Failed to load employees and courses:", e);
      setError("Unable to load employees and courses. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  const departments = useMemo(() => {
    const grouped = new Map<string, User[]>();
    users.forEach((user) => {
      const label = user.department || (user.department_id ? "Department " + user.department_id : "Unassigned department");
      grouped.set(label, [...(grouped.get(label) || []), user]);
    });
    return Array.from(grouped.entries());
  }, [users]);

  function toggleUser(id: number) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function submitRequest() {
    setError("");
    setSuccess("");
    if (!courseId || selectedIds.length === 0) {
      setError("Select a course and at least one employee.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitCourseAssignmentRequest(Number(courseId), selectedIds);
      setSuccess("Approval request sent to " + result.department_requests + " department head(s). Employees will be enrolled after approval.");
      setSelectedIds([]);
      setCourseId("");
    } catch (e: any) {
      setError(e?.message || "Could not submit the approval request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Assign Courses" description="Select a course and employees. Each department's Department Head must approve before employees are enrolled." />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="block text-sm font-medium text-slate-700">
              Course to assign
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                <option value="">Select a course</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            </label>
            <button type="button" disabled={submitting || !courseId || selectedIds.length === 0} onClick={submitRequest} className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
              {submitting ? "Sending request..." : "Send for approval (" + selectedIds.length + ")"}
            </button>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
          <p className="text-xs text-slate-500">Employees are grouped automatically by department. Each group is sent only to its assigned Department Head.</p>
        </div>

        {loading ? <PageLoadingSkeleton title="Loading employees" variant="table" rows={6} /> : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No employees found.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{users.length} employees</span>
              <button type="button" onClick={() => setSelectedIds(selectedIds.length === users.length ? [] : users.map((u) => u.id))} className="font-semibold text-amber-700 hover:text-amber-800">
                {selectedIds.length === users.length ? "Clear selection" : "Select all employees"}
              </button>
            </div>
            {departments.map(([department, members]) => (
              <section key={department} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <h2 className="font-semibold text-slate-800">{department}</h2>
                  <button type="button" onClick={() => {
                    const ids = members.map((u) => u.id);
                    const allSelected = ids.every((id) => selectedIds.includes(id));
                    setSelectedIds((current) => allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids])));
                  }} className="text-xs font-semibold text-amber-700">
                    {members.every((u) => selectedIds.includes(u.id)) ? "Deselect department" : "Select department"}
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {members.map((user) => (
                    <label key={user.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      <input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggleUser(user.id)} className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800">{user.name}</span>
                        <span className="block text-xs text-slate-500">{user.email}</span>
                      </span>
                      <span className="text-xs text-slate-400">Employee</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
