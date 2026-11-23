"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/common/PageHeader";
import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";
import {
  decideCertificateApprovalRequest,
  getCertificateApprovalRequests,
  resubmitCertificateApprovalRequest,
} from "@/lib/course-api";

type CertificateRequest = {
  id: number;
  user_id: number;
  user_name: string;
  course_id: number;
  course_title: string;
  department?: string | null;
  status: string;
  department_head_note?: string | null;
  company_admin_note?: string | null;
  submitted_at?: string;
};

const statusLabels: Record<string, string> = {
  pending_department_head: "Pending Department Head",
  pending_company_admin: "Pending Company Admin",
  rejected_department_head: "Rejected by Department Head",
  rejected_company_admin: "Rejected by Company Admin",
  approved: "Approved and issued",
};

export default function CertificateApprovalsPage() {
  const [role, setRole] = useState("");
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const rows = await getCertificateApprovalRequests();
      setRequests(Array.isArray(rows) ? rows : []);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Unable to load certificate requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setRole(localStorage.getItem("role") || "");
    load();
  }, []);

  async function decide(id: number, decision: "approve" | "reject") {
    const note = decision === "reject" ? window.prompt("Reason for rejection (optional):") : "";
    if (decision === "reject" && note === null) return;
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await decideCertificateApprovalRequest(id, decision, note || "");
      setMessage(decision === "approve" ? "Approval recorded successfully." : "Request rejected. The learner can submit it again.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not submit your decision.");
    } finally {
      setBusyId(null);
    }
  }

  async function resubmit(courseId: number) {
    setBusyId(courseId);
    setError("");
    setMessage("");
    try {
      await resubmitCertificateApprovalRequest(courseId);
      setMessage("Your certificate request has been resubmitted to your Department Head.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not resubmit the request.");
    } finally {
      setBusyId(null);
    }
  }

  const employee = role === "employee";
  const pending = requests.filter((r) =>
    employee ? false : r.status === (role === "department_head" ? "pending_department_head" : "pending_company_admin")
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={employee ? "My Certificate Requests" : "Certificate Approvals"}
          description={employee
            ? "Track the approval status of certificates for your completed courses."
            : role === "department_head"
              ? "Review certificate requests from learners in your department."
              : "Review certificate requests approved by Department Heads."}
        />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
        {loading ? <PageLoadingSkeleton title="Loading certificate requests" variant="cards" rows={3} /> : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="font-semibold text-slate-800">No certificate requests</h2>
            <p className="mt-1 text-sm text-slate-500">{employee ? "Requests submitted after course completion will appear here." : "There are no requests awaiting your review."}</p>
          </div>
        ) : employee ? (
          <section className="space-y-3">
            {requests.map((request) => {
              const rejected = request.status === "rejected_department_head" || request.status === "rejected_company_admin";
              return (
                <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">{request.course_title}</h2>
                      <p className="mt-1 text-sm text-slate-500">{statusLabels[request.status] || request.status}</p>
                      {request.department_head_note && <p className="mt-2 text-sm text-slate-600">Department Head feedback: {request.department_head_note}</p>}
                      {request.company_admin_note && <p className="mt-2 text-sm text-slate-600">Company Admin feedback: {request.company_admin_note}</p>}
                    </div>
                    {rejected && <button type="button" disabled={busyId === request.course_id} onClick={() => resubmit(request.course_id)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId === request.course_id ? "Submitting..." : "Resubmit request"}</button>}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Pending review ({pending.length})</h2>
            {pending.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">There are no requests awaiting your review.</p> : pending.map((request) => (
              <article key={request.id} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{request.department || "Department"}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{request.course_title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{request.user_name} · Submitted {request.submitted_at ? new Date(request.submitted_at).toLocaleString() : "recently"}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{statusLabels[request.status]}</span>
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" disabled={busyId === request.id} onClick={() => decide(request.id, "reject")} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
                  <button type="button" disabled={busyId === request.id} onClick={() => decide(request.id, "approve")} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{busyId === request.id ? "Processing..." : role === "department_head" ? "Approve for Company Admin" : "Approve and issue certificate"}</button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
