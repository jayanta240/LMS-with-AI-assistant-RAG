"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/common/PageHeader";
import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";
import { decideCourseAssignmentRequest, getCourseAssignmentRequests } from "@/lib/course-api";

type AssignmentRequest = {
  id: number;
  department: string;
  course_title: string;
  employees: { id: number; name: string }[];
  status: "pending" | "approved" | "rejected";
  decision_note?: string | null;
  created_at?: string;
};

export default function CourseAssignmentApprovalsPage() {
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadRequests() {
    setLoading(true);
    try {
      const data = await getCourseAssignmentRequests();
      setRequests(Array.isArray(data) ? data : []);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Unable to load approval requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRequests(); }, []);

  async function decide(id: number, decision: "approve" | "reject") {
    const promptText = decision === "reject" ? window.prompt("Optional reason for rejection:") : "";
    if (decision === "reject" && promptText === null) return;
    setBusyId(id);
    setError("");
    try {
      await decideCourseAssignmentRequest(id, decision, promptText || "");
      await loadRequests();
    } catch (e: any) {
      setError(e?.message || "Could not submit your decision.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((request) => request.status === "pending");
  const history = requests.filter((request) => request.status !== "pending");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Course Assignment Approvals" description="Review course assignment requests for employees in your department." />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading ? <PageLoadingSkeleton title="Loading approval requests" variant="cards" rows={4} /> : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h2 className="font-semibold text-slate-800">No approval requests</h2>
            <p className="mt-1 text-sm text-slate-500">New course assignment requests will appear here.</p>
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Pending ({pending.length})</h2>
              {pending.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">There are no pending requests.</p> : pending.map((request) => (
                <article key={request.id} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{request.department || "Department"}</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{request.course_title || "Course"}</h3>
                      <p className="mt-1 text-sm text-slate-500">{request.employees.length} employee(s) · Submitted {request.created_at ? new Date(request.created_at).toLocaleString() : "recently"}</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Pending review</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {request.employees.map((employee) => <span key={employee.id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{employee.name}</span>)}
                  </div>
                  <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                    <button type="button" disabled={busyId === request.id} onClick={() => decide(request.id, "reject")} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
                    <button type="button" disabled={busyId === request.id} onClick={() => decide(request.id, "approve")} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{busyId === request.id ? "Processing..." : "Approve and enroll"}</button>
                  </div>
                </article>
              ))}
            </section>
            {history.length > 0 && <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Decision history</h2>
              {history.map((request) => (
                <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-semibold text-slate-800">{request.course_title}</p><p className="text-sm text-slate-500">{request.department} · {request.employees.length} employee(s)</p></div>
                    <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (request.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{request.status}</span>
                  </div>
                  {request.decision_note && <p className="mt-2 text-sm text-slate-500">Note: {request.decision_note}</p>}
                </article>
              ))}
            </section>}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
