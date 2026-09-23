"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Bell,
  Check,
  Mail,
  Award,
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  getNotificationSettings,
  updateNotificationSettings,
  NotificationSettings,
} from "@/lib/notification-api";

export default function NotificationSettingsPage() {

  const [settings, setSettings] =
    useState<NotificationSettings>({
      course_assignment_email: true,
      certificate_email: true,
    });

  const [emailConfigured, setEmailConfigured] =
    useState<boolean | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {

    async function load() {

      try {

        const data =
          await getNotificationSettings();

        setSettings(
          data.settings
        );

        setEmailConfigured(
          data.email_delivery_configured ??
          null
        );

      } catch (err: any) {

        setError(
          err?.message ||
          "Failed to load notification settings."
        );

      } finally {

        setLoading(false);

      }

    }

    load();

  }, []);

  async function handleSave() {

    try {

      setSaving(true);
      setMessage("");
      setError("");

      const data =
        await updateNotificationSettings(
          settings
        );

      setSettings(
        data.settings
      );

      setMessage(
        "Notification settings saved successfully."
      );

    } catch (err: any) {

      setError(
        err?.message ||
        "Failed to save notification settings."
      );

    } finally {

      setSaving(false);

    }

  }

  return (

    <DashboardLayout>

      <div className="mx-auto max-w-4xl space-y-6">

        <div>

          <p
            className="text-sm font-semibold"
            style={{
              color:
                "var(--brand-accent)",
            }}
          >
            Configuration
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Email Notifications
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Choose which automatic LMS emails your employees receive.
          </p>

        </div>

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Loading notification settings...
            </p>
          </div>

        ) : (

          <>

            {emailConfigured === false && (

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">

                <p className="text-sm font-semibold text-amber-900">
                  Email delivery is not configured yet.
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  These controls are ready, but the LMS needs SMTP
                  credentials in the backend environment before emails
                  can actually be delivered.
                </p>

              </div>

            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 p-6">

                <div className="flex items-center gap-3">

                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--brand-primary) 10%, white)",
                      color:
                        "var(--brand-primary)",
                    }}
                  >
                    <Bell size={21} />
                  </div>

                  <div>

                    <h2 className="text-lg font-semibold text-slate-900">
                      Automatic Email Notifications
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      These settings apply to employees in your company.
                    </p>

                  </div>

                </div>

              </div>

              <div className="divide-y divide-slate-100">

                <NotificationRow
                  icon={
                    <Mail size={20} />
                  }
                  title="Course assignment emails"
                  description="Email an employee when a Company Admin or Department Head assigns a course to them."
                  enabled={
                    settings.course_assignment_email
                  }
                  onChange={(enabled) =>
                    setSettings(
                      (current) => ({
                        ...current,
                        course_assignment_email:
                          enabled,
                      })
                    )
                  }
                />

                <NotificationRow
                  icon={
                    <Award size={20} />
                  }
                  title="Certificate emails"
                  description="Email the employee their certificate automatically after they complete a course."
                  enabled={
                    settings.certificate_email
                  }
                  onChange={(enabled) =>
                    setSettings(
                      (current) => ({
                        ...current,
                        certificate_email:
                          enabled,
                      })
                    )
                  }
                />

              </div>

              <div className="border-t border-slate-100 p-6">

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={17} />

                  {saving
                    ? "Saving..."
                    : "Save Notification Settings"}

                </button>

                {message && (
                  <p className="mt-3 text-sm font-medium text-emerald-600">
                    {message}
                  </p>
                )}

                {error && (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    {error}
                  </p>
                )}

              </div>

            </div>

          </>

        )}

      </div>

    </DashboardLayout>
  );
}

function NotificationRow({
  icon,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {

  return (

    <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">

      <div className="flex gap-4">

        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
          {icon}
        </div>

        <div>

          <h3 className="text-base font-semibold text-slate-900">
            {title}
          </h3>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>

        </div>

      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() =>
          onChange(!enabled)
        }
        className={[
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition",
          enabled
            ? "bg-emerald-500"
            : "bg-slate-300",
        ].join(" ")}
      >

        <span
          className={[
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            enabled
              ? "translate-x-6"
              : "translate-x-1",
          ].join(" ")}
        />

      </button>

    </div>

  );
}
