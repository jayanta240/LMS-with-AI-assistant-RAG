"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FileText,
  Film,
  Trash2,
  RefreshCw,
} from "lucide-react";

import {
  getFiles,
  deleteFile,
} from "@/lib/course-api";

type FileItem = {
  id: number;
  filename: string;
  filetype: string;
  cloudinary_url: string;
  size_mb: number;
  uploaded_at: string;
  company_id?: number;
};

export default function FilesPage() {

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadFiles() {

    try {

      setLoading(true);

      const data = await getFiles();

      setFiles(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load files:",
        error
      );

      setFiles([]);

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    loadFiles();

  }, []);

  async function handleDelete(file: FileItem) {

    const confirmed =
      window.confirm(
        `Delete "${file.filename}" permanently?

This removes the file record from the database and its associated stored knowledge where supported.`
      );

    if (!confirmed) {
      return;
    }

    try {

      setDeletingId(file.id);

      await deleteFile(file.id);

      await loadFiles();

    } catch (error: any) {

      alert(
        error?.message ||
        "Failed to delete file."
      );

    } finally {

      setDeletingId(null);

    }

  }

  return (

    <DashboardLayout>

      <div className="space-y-6">

        <div>

          <p className="text-sm font-semibold text-amber-600">
            Knowledge Management
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Files & Documents
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View the knowledge files available to your organization.
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <p className="text-sm text-slate-600">
              Total files
              {" "}
              <span className="font-semibold text-slate-900">
                {files.length}
              </span>
            </p>

            <button
              type="button"
              onClick={loadFiles}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

          </div>

        </div>

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Loading files...
            </p>
          </div>

        ) : files.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <FileText
              size={36}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-4 text-base font-semibold text-slate-800">
              No uploaded files found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Upload a PDF, DOCX, or supported video from AI Assistant.
            </p>
          </div>

        ) : (

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {files.map((file) => {

              const isVideo =
                file.filetype === "video";

              return (

                <div
                  key={file.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >

                  <div className="flex items-start justify-between gap-3">

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

                        {isVideo
                          ? <Film size={20} />
                          : <FileText size={20} />
                        }

                      </div>

                      <div className="min-w-0">

                        <p className="truncate font-semibold text-slate-900">
                          {file.filename}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {file.filetype}
                          {" • "}
                          {file.size_mb ?? 0} MB
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      disabled={deletingId === file.id}
                      onClick={() => handleDelete(file)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                      title="Delete file"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    Uploaded{" "}
                    {file.uploaded_at
                      ? new Date(file.uploaded_at).toLocaleString()
                      : "-"}
                  </p>

                  {isVideo && file.cloudinary_url ? (

                    <video
                      controls
                      className="mt-4 w-full rounded-xl"
                    >
                      <source
                        src={file.cloudinary_url}
                        type="video/mp4"
                      />
                    </video>

                  ) : null}

                </div>

              );

            })}

          </div>

        )}

      </div>

    </DashboardLayout>

  );

}
