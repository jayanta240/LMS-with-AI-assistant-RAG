"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";


type AuditEvent = {
  id: number;
  actor_user_id: number | null;
  actor_email: string | null;
  actor_role: string;
  action: string;
  resource: string;
  resource_id: string | null;
  method: string;
  endpoint: string;
  status_code: number;
  ip_address: string | null;
  created_at: string;
};

type AuditResponse = {
  items: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
};

const PAGE_SIZE = 50;

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");


function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}


export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAuditLogs() {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
          search,
        });

        const response = await fetch(
          `${API_BASE}/api/audit-logs?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token || ""}`,
            },
            cache: "no-store",
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.detail || "Unable to load audit logs."
          );
        }

        if (!cancelled) {
          const result = data as AuditResponse;
          setItems(result.items || []);
          setTotal(result.total || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load audit logs."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [offset, search, refreshKey]);

  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
              <ShieldCheck size={17} />
              Platform governance
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Audit Logs
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review administrative changes and learner activity recorded by the LMS.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <ClipboardList size={18} className="text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Recorded events</p>
              <p className="text-lg font-semibold text-slate-900">
                {total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Activity history</h2>
              <p className="mt-1 text-xs text-slate-500">
                Successful write actions and successful sign-ins.
              </p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setOffset(0);
                }}
                placeholder="Search user, action or endpoint..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>

          {error && (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Activity</th>
                  <th className="px-5 py-3 font-semibold">Performed by</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Resource</th>
                  <th className="px-5 py-3 font-semibold">Endpoint</th>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      Loading audit history...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      {error ? "Audit history could not be loaded." : "No audit events found."}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {humanize(item.action)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {item.actor_email || "Unknown user"}
                        </p>
                        {item.actor_user_id && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            User ID: {item.actor_user_id}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {humanize(item.actor_role)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <span className="font-medium text-slate-700">
                          {humanize(item.resource)}
                        </span>
                        {item.resource_id && (
                          <span className="ml-1 text-xs text-slate-400">
                            #{item.resource_id}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs text-slate-600">
                          {item.method} {item.endpoint}
                        </p>
                        {item.ip_address && (
                          <p className="mt-1 text-xs text-slate-400">
                            {item.ip_address}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {item.status_code}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {total === 0
                ? "No events"
                : `Showing ${offset + 1}–${Math.min(offset + items.length, total)} of ${total.toLocaleString()} events`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0 || loading}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                Previous
              </button>
              <span className="px-2 text-xs text-slate-500">
                Page {pageNumber} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total || loading}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setOffset(0);
                  setRefreshKey((value) => value + 1);
                }}
                disabled={loading}
                aria-label="Refresh audit logs"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
