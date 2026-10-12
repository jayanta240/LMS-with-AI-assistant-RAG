"use client";

import { useEffect, useState } from "react";
import EmployeeLayout from "@/components/layout/EmployeeLayout";
import { Camera, UserRound, Loader2, CheckCircle2 } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem("user_name") || localStorage.getItem("name") || "Learner");
    setEmail(localStorage.getItem("email") || "");
    setRole((localStorage.getItem("role") || "employee").replaceAll("_", " "));
    setPhotoUrl(localStorage.getItem("profile_photo_url") || "");
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    event.target.value = "";
    setMessage("");
    setError("");
    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/jpg"].includes(selected.type)) {
      setError("Choose a JPG or PNG image.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setFile(selected);
  }

  async function savePhoto() {
    if (!file) {
      setError("Choose a photo first.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.append("profile_photo", file);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/profile/photo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || "Could not update profile photo.");
      }

      const nextUrl = data.profile_photo_url || "";
      localStorage.setItem("profile_photo_url", nextUrl);
      setPhotoUrl(nextUrl);
      setPhotoError(false);
      setFile(null);
      setPreview("");
      setMessage("Profile photo updated successfully.");
      window.dispatchEvent(new CustomEvent("lms-profile-photo-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile photo.");
    } finally {
      setSaving(false);
    }
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm font-semibold text-amber-600">Account Settings</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage your profile picture. Your updated photo will appear throughout the LMS wherever your account is shown.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-amber-100 bg-amber-50 text-3xl font-bold text-amber-700">
              {(preview || (photoUrl && !photoError)) ? (
                <img
                  src={preview || photoUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                  onError={() => setPhotoError(true)}
                />
              ) : initials || <UserRound size={40} />}
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold text-slate-900">{name}</h2>
              <p className="mt-1 text-sm text-slate-500">{email}</p>
              <p className="mt-1 text-sm capitalize text-slate-500">{role}</p>
              <p className="mt-4 text-xs text-slate-500">JPG or PNG · Maximum 5 MB</p>

              <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <Camera size={17} />
                  {photoUrl ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    onChange={choosePhoto}
                  />
                </label>

                <button
                  type="button"
                  onClick={savePhoto}
                  disabled={!file || saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                  {saving ? "Saving..." : "Save photo"}
                </button>
              </div>
            </div>
          </div>

          {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="mt-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        </section>
      </div>
    </EmployeeLayout>
  );
}
