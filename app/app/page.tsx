"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import DashboardLayout from "../components/layout/DashboardLayout";
import EmployeeLayout from "../components/layout/EmployeeLayout";

import {
  sendMessage,
  uploadVideos,
  generateVideo,
  getMessages,
  createSession,
  diagnoseImage,
} from "../lib/api";

import {
  Sparkles,
  Plus,
  Upload,
  Paperclip,
  Send,
  X,
  FileText,
  FileSpreadsheet,
  Video,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

import {
  useBranding,
} from "@/components/providers/BrandThemeProvider";


type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
  video?: string;
};


export default function Home() {
  const {
    branding,
  } = useBranding();

  const [message, setMessage] =
    useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [role, setRole] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [session, setSession] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [videoLoading, setVideoLoading] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [uploadMessage, setUploadMessage] =
    useState("");

  const [uploadProgress, setUploadProgress] =
    useState<Record<string, number>>({});

  const [expandedSources, setExpandedSources] =
    useState<Record<number, boolean>>({});


  // =========================================================
  // UPLOAD VISIBILITY
  // =========================================================

  const [showUploadSettings, setShowUploadSettings] =
    useState(false);

  const [uploadVisibility, setUploadVisibility] =
    useState<
      "company" |
      "department" |
      "course"
    >("company");

  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState<number | undefined>(undefined);

  const [selectedCourseId, setSelectedCourseId] =
    useState<number | undefined>(undefined);

  const [departments, setDepartments] =
    useState<any[]>([]);

  const [courses, setCourses] =
    useState<any[]>([]);

  const [optionsLoading, setOptionsLoading] =
    useState(false);


  const bottomRef =
    useRef<HTMLDivElement>(null);


  // =========================================================
  // LOAD MESSAGES
  // =========================================================

  useEffect(() => {
    const storedRole =
      localStorage.getItem("role") || "";

    setRole(storedRole);

    initializeAssistant();
  }, []);


  useEffect(() => {
    if (!session) {
      return;
    }

    loadMessages(session);
  }, [session]);


  async function initializeAssistant() {
    try {
      const response =
        await createSession();

      if (!response?.id) {
        throw new Error(
          "Failed to create assistant session."
        );
      }

      setSession(
        response.id
      );

      setMessages([]);

    } catch (error) {
      console.error(
        "Failed to initialize assistant:",
        error
      );

      setMessages([]);
    }
  }


  async function loadMessages(
    sessionId: string
  ) {
    try {
      const data =
        await getMessages(sessionId);

      setMessages(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {
      console.error(
        "Failed to load messages:",
        error
      );

      setMessages([]);
    }
  }


  // =========================================================
  // AUTO SCROLL
  // =========================================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);


  // =========================================================
  // SEND MESSAGE
  // =========================================================

  async function handleSend() {
    if (
      !message.trim() &&
      !imageFile
    ) {
      return;
    }

    const currentMessage =
      message.trim();

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content:
          currentMessage ||
          "📷 Image Uploaded",
      },
    ]);

    setLoading(true);

    try {

      // =====================================================
      // IMAGE DIAGNOSIS
      // =====================================================

      if (imageFile) {
        const diagnosis =
          await diagnoseImage(
            imageFile
          );

        let answer = "";

        if (diagnosis?.success) {

          answer = `
### Detected Issue

${diagnosis.problem}

### Confidence

${(
  Number(
    diagnosis.similarity || 0
  ) * 100
).toFixed(1)}%

### Solution

${diagnosis.solution}
`;

        } else {
          answer =
            "No matching issue found.";
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: answer,
          },
        ]);

        setImageFile(null);
        setMessage("");

        return;
      }


      // =====================================================
      // NORMAL CHAT
      // =====================================================

      const response =
        await sendMessage(
          currentMessage,
          session
        );

      if (!response) {
        throw new Error(
          "No response received from assistant."
        );
      }

      if (response.detail) {
        throw new Error(
          response.detail
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            response.answer ||
            "I could not generate a response.",
          sources:
            Array.isArray(
              response.sources
            )
              ? response.sources
              : [],
        },
      ]);

      setMessage("");

    } catch (error: any) {
      console.error(
        "Assistant error:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            `⚠️ ${
              error?.message ||
              "Failed to get a response from the assistant."
            }`,
        },
      ]);

    } finally {
      setLoading(false);
    }
  }


  // =========================================================
  // ENTER TO SEND
  // =========================================================

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      handleSend();
    }
  }


  // =========================================================
  // LOAD DEPARTMENTS + COURSES FOR UPLOAD
  // =========================================================

  async function loadUploadOptions() {
    try {
      setOptionsLoading(true);

      setUploadMessage("");

      const token =
        localStorage.getItem("token");

      const companyId =
        localStorage.getItem("company_id");

      if (!token || !companyId) {
        throw new Error(
          "Company information is missing."
        );
      }

      const base =
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:8000";


      // =====================================================
      // DEPARTMENTS
      // =====================================================

      const departmentResponse =
        await fetch(
          `${base}/api/companies/${companyId}/departments`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const departmentData =
        await departmentResponse.json();

      if (!departmentResponse.ok) {
        throw new Error(
          departmentData?.detail ||
          "Failed to load departments."
        );
      }

      setDepartments(
        Array.isArray(departmentData)
          ? departmentData
          : []
      );


      // =====================================================
      // COURSES
      // =====================================================

      const courseResponse =
        await fetch(
          `${base}/api/courses`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const courseData =
        await courseResponse.json();

      if (!courseResponse.ok) {
        throw new Error(
          courseData?.detail ||
          "Failed to load courses."
        );
      }

      setCourses(
        Array.isArray(courseData)
          ? courseData
          : []
      );

    } catch (error) {
      console.error(
        "Failed to load upload options:",
        error
      );

      setDepartments([]);
      setCourses([]);

      setUploadMessage(
        error instanceof Error
          ? error.message
          : "Failed to load upload options."
      );

    } finally {
      setOptionsLoading(false);
    }
  }


  // =========================================================
  // OPEN UPLOAD SETTINGS
  // =========================================================

  async function openUploadSettings() {
    setUploadMessage("");

    setUploadVisibility(
      "company"
    );

    setSelectedDepartmentId(
      undefined
    );

    setSelectedCourseId(
      undefined
    );

    await loadUploadOptions();

    setShowUploadSettings(true);
  }


  // =========================================================
  // UPLOAD
  // =========================================================

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files =
      e.target.files;

    if (
      !files ||
      files.length === 0
    ) {
      return;
    }


    // -------------------------------------------------------
    // FRONTEND VALIDATION
    // -------------------------------------------------------

    if (
      uploadVisibility ===
      "department" &&
      selectedDepartmentId ===
        undefined
    ) {
      setUploadMessage(
        "Please select a department first."
      );

      e.target.value = "";

      return;
    }


    if (
      uploadVisibility ===
      "course" &&
      selectedCourseId ===
        undefined
    ) {
      setUploadMessage(
        "Please select a course first."
      );

      e.target.value = "";

      return;
    }


    try {

      setUploading(true);

      setUploadMessage(
        "Uploading..."
      );


      // -----------------------------------------------------
      // INITIAL PROGRESS
      // -----------------------------------------------------

      const initialProgress:
        Record<string, number> = {};

      Array.from(files).forEach(
        (file) => {
          initialProgress[
            file.name
          ] = 0;
        }
      );

      setUploadProgress(
        initialProgress
      );


      // -----------------------------------------------------
      // SEND UPLOAD
      // -----------------------------------------------------

      const response =
        await uploadVideos(
          files,

          uploadVisibility,

          uploadVisibility ===
            "department"
            ? selectedDepartmentId
            : undefined,

          uploadVisibility ===
            "course"
            ? selectedCourseId
            : undefined,

          (
            fileName: string,
            percentage: number
          ) => {

            setUploadProgress(
              (prev) => ({
                ...prev,
                [fileName]:
                  percentage,
              })
            );

          }
        );


      // -----------------------------------------------------
      // RESULT
      // -----------------------------------------------------

      const uploaded =
        Array.isArray(
          response?.uploaded
        )
          ? response.uploaded
          : [];


      const failed =
        Array.isArray(
          response?.failed
        )
          ? response.failed
          : [];


      // -----------------------------------------------------
      // COMPLETE PROGRESS
      // -----------------------------------------------------

      if (
        uploaded.length > 0
      ) {

        setUploadProgress(
          (prev) => {

            const updated = {
              ...prev,
            };

            uploaded.forEach(
              (fileName: string) => {
                updated[
                  fileName
                ] = 100;
              }
            );

            return updated;
          }
        );

      }


      // -----------------------------------------------------
      // SUCCESS MESSAGE
      // -----------------------------------------------------

      if (
        uploaded.length > 0 &&
        failed.length === 0
      ) {

        setUploadMessage(
          `${uploaded.length} file${
            uploaded.length === 1
              ? ""
              : "s"
          } uploaded successfully.`
        );

      } else if (
        uploaded.length > 0 &&
        failed.length > 0
      ) {

        setUploadMessage(
          `${uploaded.length} uploaded, ${failed.length} failed.`
        );

      }  else {

        setUploadMessage(
          "No files were uploaded."
        );

      }


      // -----------------------------------------------------
      // RESET VISIBILITY
      // -----------------------------------------------------

      setUploadVisibility(
        "company"
      );

      setSelectedDepartmentId(
        undefined
      );

      setSelectedCourseId(
        undefined
      );

    } catch (error: any) {

      console.error(
        "Upload error:",
        error
      );

      setUploadMessage(
        error?.message ||
        "Upload failed."
      );

    } finally {

      setUploading(false);

      e.target.value = "";
    }
  }


  // =========================================================
  // NEW CHAT
  // =========================================================

  async function handleNewChat() {
    try {

      const response =
        await createSession();

      if (response?.id) {

        setSession(
          response.id
        );

        setMessages([]);

      } else {
        setMessages([]);
      }

    } catch (error) {

      console.error(
        "Failed to create session:",
        error
      );

    }
  }


  // =========================================================
  // GENERATE VIDEO
  // =========================================================

  async function handleGenerateVideo(
    content: string
  ) {
    try {

      setVideoLoading(true);

      const response =
        await generateVideo(
          content
        );

      if (!response?.video_path) {
        throw new Error(
          "Video generation failed."
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "🎥 Generated Explanation Video",
          video:
            response.video_path,
        },
      ]);

    } catch (error: any) {

      console.error(
        "Video generation error:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            `⚠️ ${
              error?.message ||
              "Unable to generate video."
            }`,
        },
      ]);

    } finally {
      setVideoLoading(false);
    }
  }


  // =========================================================
  // SOURCE TOGGLE
  // =========================================================

  function toggleSources(
    index: number
  ) {
    setExpandedSources(
      (prev) => ({
        ...prev,
        [index]:
          !prev[index],
      })
    );
  }


  // =========================================================
  // SOURCE ICON
  // =========================================================

  function getSourceIcon(
    source: any
  ) {

    const type =
      String(
        source?.type || ""
      ).toLowerCase();

    const filename =
      String(
        source?.source || ""
      ).toLowerCase();


    if (
      type === "video" ||
      filename.endsWith(".mp4") ||
      filename.endsWith(".mov") ||
      filename.endsWith(".avi")
    ) {

      return (
        <Video
          size={15}
          className="text-blue-500"
        />
      );
    }


    if (
      type === "spreadsheet" ||
      filename.endsWith(".csv") ||
      filename.endsWith(".xlsx") ||
      filename.endsWith(".xls")
    ) {

      return (
        <FileSpreadsheet
          size={15}
          className="text-emerald-500"
        />
      );
    }


    return (
      <FileText
        size={15}
        className="text-red-500"
      />
    );
  }


  // =========================================================
  // LAYOUT
  // =========================================================

  const Layout =
    role === "employee"
      ? EmployeeLayout
      : DashboardLayout;


  return (
    <Layout>

      <div className="flex min-h-[calc(100vh-130px)] flex-col">

        {/* =====================================================
            HEADER
           ===================================================== */}

        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                AI Assistant
              </h1>

              <Sparkles
                size={19}
                style={{
                  color:
                    "var(--brand-accent)",
                }}
              />

            </div>

            <p className="mt-1 text-sm text-slate-500">
              Ask anything about your organization&apos;s knowledge base.
            </p>

          </div>


          <div className="flex flex-wrap items-center gap-3">

            {/* -------------------------------------------------
                UPLOAD MESSAGE
               ------------------------------------------------- */}

            {uploadMessage && (
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {uploadMessage}
              </div>
            )}


            {/* -------------------------------------------------
                UPLOAD PROGRESS
               ------------------------------------------------- */}

            {uploading &&
              Object.keys(
                uploadProgress
              ).length > 0 && (

                <div className="w-full max-w-[360px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

                  <div className="mb-2 flex items-center justify-between">

                    <span className="text-xs font-semibold text-slate-700">
                      Uploading knowledge
                    </span>

                    <Loader2
                      size={14}
                      className="animate-spin text-slate-500"
                    />

                  </div>


                  <div className="space-y-3">

                    {Object.entries(
                      uploadProgress
                    ).map(
                      ([
                        fileName,
                        percentage,
                      ]) => (

                        <div
                          key={
                            fileName
                          }
                        >

                          <div className="mb-1 flex items-center justify-between gap-3">

                            <span className="max-w-[260px] truncate text-[11px] text-slate-500">
                              {fileName}
                            </span>

                            <span className="shrink-0 text-[11px] font-semibold text-slate-700">
                              {percentage}%
                            </span>

                          </div>


                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                            <div
                              className="h-full rounded-full transition-all duration-200"
                              style={{
                                width:
                                  `${percentage}%`,
                                backgroundColor:
                                  "var(--brand-primary)",
                              }}
                            />

                          </div>

                        </div>

                      )
                    )}

                  </div>

                </div>
            )}


            {/* -------------------------------------------------
                NEW CHAT
               ------------------------------------------------- */}

            <button
              type="button"
              onClick={
                handleNewChat
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Plus
                size={17}
              />

              New Chat
            </button>


            {/* -------------------------------------------------
                UPLOAD KNOWLEDGE
               ------------------------------------------------- */}

            {role === "company_admin" && (

              <button
                type="button"
                onClick={
                  openUploadSettings
                }
                disabled={
                  uploading
                }
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor:
                    "var(--brand-primary)",
                  color:
                    "var(--brand-primary-text)",
                }}
              >

                {uploading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Upload
                    size={17}
                  />
                )}

                {uploading
                  ? "Uploading..."
                  : "Upload Knowledge"}

              </button>
            )}

          </div>

        </div>


        {/* =====================================================
            UPLOAD SETTINGS
           ===================================================== */}

        {showUploadSettings && (

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            {/* -------------------------------------------------
                TITLE
               ------------------------------------------------- */}

            <div className="flex items-start justify-between gap-4">

              <div>

                <h3 className="text-sm font-semibold text-slate-900">
                  Upload Knowledge
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Choose who should be able to access this content.
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowUploadSettings(
                    false
                  )
                }
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X
                  size={17}
                />
              </button>

            </div>


            {/* -------------------------------------------------
                VISIBILITY OPTIONS
               ------------------------------------------------- */}

            <div className="mt-5 space-y-3">

              {/* =================================================
                  COMPANY
                 ================================================= */}

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

                <input
                  type="radio"
                  name="uploadVisibility"
                  value="company"
                  checked={
                    uploadVisibility ===
                    "company"
                  }
                  onChange={() => {

                    setUploadVisibility(
                      "company"
                    );

                    setSelectedDepartmentId(
                      undefined
                    );

                    setSelectedCourseId(
                      undefined
                    );

                  }}
                />

                <div>

                  <div className="text-sm font-semibold text-slate-800">
                    Entire Company
                  </div>

                  <div className="mt-0.5 text-xs text-slate-500">
                    Everyone in your company can access this content.
                  </div>

                </div>

              </label>


              {/* =================================================
                  DEPARTMENT
                 ================================================= */}

              <div className="rounded-xl border border-slate-200 p-4">

                <label className="flex cursor-pointer items-center gap-3">

                  <input
                    type="radio"
                    name="uploadVisibility"
                    value="department"
                    checked={
                      uploadVisibility ===
                      "department"
                    }
                    onChange={() => {

                      setUploadVisibility(
                        "department"
                      );

                      setSelectedCourseId(
                        undefined
                      );

                    }}
                  />

                  <div>

                    <div className="text-sm font-semibold text-slate-800">
                      Department
                    </div>

                    <div className="mt-0.5 text-xs text-slate-500">
                      Only employees in the selected department can access it.
                    </div>

                  </div>

                </label>


                {uploadVisibility ===
                  "department" && (

                  <div className="mt-4">

                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Select Department
                    </label>

                    <select
                      value={
                        selectedDepartmentId ??
                        ""
                      }
                      onChange={(e) =>
                        setSelectedDepartmentId(
                          e.target.value
                            ? Number(
                                e.target.value
                              )
                            : undefined
                        )
                      }
                      disabled={
                        optionsLoading
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                    >

                      <option value="">
                        {optionsLoading
                          ? "Loading departments..."
                          : "Select a department"}
                      </option>


                      {departments.map(
                        (
                          department
                        ) => (

                          <option
                            key={
                              department.id
                            }
                            value={
                              department.id
                            }
                          >
                            {
                              department.department_name
                            }
                          </option>

                        )
                      )}

                    </select>

                  </div>

                )}

              </div>


              {/* =================================================
                  COURSE
                 ================================================= */}

              <div className="rounded-xl border border-slate-200 p-4">

                <label className="flex cursor-pointer items-center gap-3">

                  <input
                    type="radio"
                    name="uploadVisibility"
                    value="course"
                    checked={
                      uploadVisibility ===
                      "course"
                    }
                    onChange={() => {

                      setUploadVisibility(
                        "course"
                      );

                      setSelectedDepartmentId(
                        undefined
                      );

                    }}
                  />

                  <div>

                    <div className="text-sm font-semibold text-slate-800">
                      Course Enrollees
                    </div>

                    <div className="mt-0.5 text-xs text-slate-500">
                      Only employees enrolled in the selected course can access it.
                    </div>

                  </div>

                </label>


                {uploadVisibility ===
                  "course" && (

                  <div className="mt-4">

                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Select Course
                    </label>

                    <select
                      value={
                        selectedCourseId ??
                        ""
                      }
                      onChange={(e) =>
                        setSelectedCourseId(
                          e.target.value
                            ? Number(
                                e.target.value
                              )
                            : undefined
                        )
                      }
                      disabled={
                        optionsLoading
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                    >

                      <option value="">
                        {optionsLoading
                          ? "Loading courses..."
                          : "Select a course"}
                      </option>


                      {courses.map(
                        (course) => (

                          <option
                            key={
                              course.id
                            }
                            value={
                              course.id
                            }
                          >
                            {
                              course.title
                            }
                          </option>

                        )
                      )}

                    </select>

                  </div>

                )}

              </div>

            </div>


            {/* -------------------------------------------------
                BUTTONS
               ------------------------------------------------- */}

            <div className="mt-5 flex justify-end gap-3">

              <button
                type="button"
                onClick={() =>
                  setShowUploadSettings(
                    false
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>


              <label
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90"
                style={{
                  backgroundColor:
                    "var(--brand-primary)",
                  color:
                    "var(--brand-primary-text)",
                }}
              >

                <Upload
                  size={16}
                />

                Select Files


                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.csv,.xlsx,.xls,.mp4,.mov,.avi"
                  onChange={(e) => {

                    if (
                      uploadVisibility ===
                        "department" &&
                      selectedDepartmentId ===
                        undefined
                    ) {

                      setUploadMessage(
                        "Please select a department first."
                      );

                      e.target.value =
                        "";

                      return;
                    }


                    if (
                      uploadVisibility ===
                        "course" &&
                      selectedCourseId ===
                        undefined
                    ) {

                      setUploadMessage(
                        "Please select a course first."
                      );

                      e.target.value =
                        "";

                      return;
                    }


                    setShowUploadSettings(
                      false
                    );

                    handleUpload(e);

                  }}
                  disabled={
                    uploading ||
                    optionsLoading
                  }
                  className="hidden"
                />

              </label>

            </div>

          </div>
        )}


        {/* =====================================================
            CHAT AREA
           ===================================================== */}

        <div className="flex-1 overflow-y-auto py-8">

          {messages.length === 0 ? (

            /* =================================================
               EMPTY STATE
               ================================================= */

            <div className="flex min-h-[55vh] items-center justify-center">

              <div className="w-full max-w-2xl text-center">

                <div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border"
                  style={{
                    borderColor:
                      "var(--brand-accent)",
                    backgroundColor:
                      "color-mix(in srgb, var(--brand-accent) 10%, white)",
                  }}
                >

                  <Sparkles
                    size={30}
                    style={{
                      color:
                        "var(--brand-accent)",
                    }}
                  />

                </div>


                <h2 className="mt-5 text-3xl font-bold text-slate-900">
                  Hello, Admin
                </h2>


                <p className="mt-2 text-base text-slate-500">
                  How can I help you today?
                </p>


                <div className="mt-8 grid gap-3 sm:grid-cols-2">

                  {[
                    "What are the important points in the uploaded material?",
                    "Summarize the uploaded training content.",
                    "Search the uploaded files for a specific topic.",
                    "Explain an important topic from the uploaded material.",
                  ].map(
                    (suggestion) => (

                      <button
                        key={
                          suggestion
                        }
                        type="button"
                        onClick={() =>
                          setMessage(
                            suggestion
                          )
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-600 shadow-sm transition hover:bg-slate-50"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--brand-accent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "";
                        }}
                      >
                        {suggestion}
                      </button>

                    )
                  )}

                </div>

              </div>

            </div>

          ) : (

            /* =================================================
               MESSAGES
               ================================================= */

            <div className="mx-auto max-w-4xl space-y-7">

              {messages.map(
                (m, index) => (

                  <div
                    key={index}
                    className={
                      m.role === "user"
                        ? "flex justify-end"
                        : "flex items-start gap-3"
                    }
                  >


                    {m.role ===
                      "assistant" && (

                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
                        style={{
                          borderColor:
                            "var(--brand-accent)",
                          backgroundColor:
                            "color-mix(in srgb, var(--brand-accent) 10%, white)",
                        }}
                      >

                        <Sparkles
                          size={17}
                          style={{
                            color:
                              "var(--brand-accent)",
                          }}
                        />

                      </div>

                    )}


                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[78%]"
                          : "max-w-[90%] flex-1"
                      }
                    >


                      <div
                        className={
                          m.role === "user"
                            ? "rounded-2xl rounded-br-md px-5 py-4 text-sm shadow-sm"
                            : "rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
                        }
                        style={
                          m.role === "user"
                            ? {
                                backgroundColor:
                                  "color-mix(in srgb, var(--brand-primary) 11%, white)",
                                color:
                                  "var(--brand-secondary)",
                              }
                            : undefined
                        }
                      >


                        <div
                          className="
                            prose
                            prose-sm
                            max-w-none
                            text-slate-800
                            prose-headings:text-slate-900
                            prose-p:text-slate-700
                            prose-li:text-slate-700
                            prose-table:w-full
                            prose-table:border-collapse
                            prose-th:border
                            prose-th:border-slate-200
                            prose-th:bg-slate-50
                            prose-th:px-4
                            prose-th:py-2
                            prose-th:text-left
                            prose-th:text-xs
                            prose-th:font-semibold
                            prose-th:text-slate-600
                            prose-td:border
                            prose-td:border-slate-200
                            prose-td:px-4
                            prose-td:py-2
                            prose-td:text-sm
                            prose-td:text-slate-700
                          "
                        >

                          <ReactMarkdown
                            remarkPlugins={[
                              remarkGfm,
                            ]}
                          >
                            {m.content}
                          </ReactMarkdown>

                        </div>


                        {/* ==================================
                            SOURCES
                           ================================== */}

                        {m.sources &&
                          m.sources.length > 0 && (

                          <div className="mt-5 border-t border-slate-100 pt-4">

                            <button
                              type="button"
                              onClick={() =>
                                toggleSources(
                                  index
                                )
                              }
                              className="flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
                            >

                              Sources

                              {expandedSources[
                                index
                              ] !== false ? (
                                <ChevronUp
                                  size={15}
                                />
                              ) : (
                                <ChevronDown
                                  size={15}
                                />
                              )}

                            </button>


                            {expandedSources[
                              index
                            ] !== false && (

                              <div className="mt-3 flex flex-wrap gap-2">

                                {m.sources
                                  .slice(
                                    0,
                                    8
                                  )
                                  .map(
                                    (
                                      source,
                                      sourceIndex
                                    ) => (

                                      <div
                                        key={
                                          sourceIndex
                                        }
                                        className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                                      >

                                        {getSourceIcon(
                                          source
                                        )}

                                        <span className="max-w-[220px] truncate">
                                          {source?.source ||
                                            source?.video ||
                                            "Uploaded content"}
                                        </span>

                                        {source?.page && (
                                          <span className="text-slate-400">
                                            Page{" "}
                                            {
                                              source.page
                                            }
                                          </span>
                                        )}

                                      </div>

                                    )
                                  )}

                              </div>

                            )}

                          </div>

                        )}


                        {/* ==================================
                            VIDEO SOURCES
                           ================================== */}

                        {m.sources?.some(
                          (
                            source: any
                          ) =>
                            Boolean(
                              source?.video_url
                            )
                        ) && (

                          <div className="mt-4 space-y-4">

                            {m.sources
                              .filter(
                                (
                                  source: any
                                ) =>
                                  Boolean(
                                    source?.video_url
                                  )
                              )
                              .slice(
                                0,
                                2
                              )
                              .map(
                                (
                                  source: any,
                                  sourceIndex: number
                                ) => (

                                  <div
                                    key={
                                      sourceIndex
                                    }
                                  >

                                    <p className="mb-2 text-xs font-medium text-slate-500">

                                      🎥{" "}
                                      {
                                        source.video
                                      }

                                      {source.start !=
                                        null &&
                                        source.end !=
                                          null &&
                                        ` (${Number(
                                          source.start
                                        ).toFixed(
                                          1
                                        )}s - ${Number(
                                          source.end
                                        ).toFixed(
                                          1
                                        )}s)`}

                                    </p>


                                    {source.video_url && (

                                      <video
                                        src={
                                          `${source.video_url}#t=${Math.floor(
                                            Number(
                                              source.start ||
                                                0
                                            )
                                          )}`
                                        }
                                        controls
                                        preload="metadata"
                                        className="w-full rounded-xl border border-slate-200"
                                      />

                                    )}

                                  </div>

                                )
                              )}

                          </div>

                        )}


                        {/* ==================================
                            GENERATED VIDEO
                           ================================== */}

                        {m.video && (

                          <div className="mt-5">

                            <video
                              src={
                                m.video.startsWith(
                                  "http"
                                )
                                  ? m.video
                                  : `http://localhost:8000/${m.video}`
                              }
                              controls
                              preload="metadata"
                              className="w-full rounded-xl border border-slate-200"
                            />

                            <p className="mt-2 text-xs font-medium text-emerald-600">
                              ✓ Video ready
                            </p>

                          </div>

                        )}


                        {/* ==================================
                            ACTIONS
                           ================================== */}

                        {m.role ===
                          "assistant" && (

                          <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">

                            <button
                              type="button"
                              title="Copy"
                              onClick={() =>
                                navigator.clipboard?.writeText(
                                  m.content
                                )
                              }
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                            >
                              <Copy
                                size={15}
                              />
                            </button>


                            <button
                              type="button"
                              title="Helpful"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                            >
                              <ThumbsUp
                                size={15}
                              />
                            </button>


                            <button
                              type="button"
                              title="Not helpful"
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                            >
                              <ThumbsDown
                                size={15}
                              />
                            </button>


                            <div className="ml-auto">

                              {!m.video && (

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleGenerateVideo(
                                      m.content
                                    )
                                  }
                                  disabled={
                                    videoLoading
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-purple-600 transition hover:bg-purple-50 disabled:opacity-50"
                                >

                                  {videoLoading
                                    ? "Generating..."
                                    : "🎥 Generate Video"}

                                </button>

                              )}

                            </div>

                          </div>

                        )}

                      </div>

                    </div>

                  </div>

                )
              )}


              {/* Thinking */}

              {loading && (

                <div className="flex items-center gap-3">

                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full border"
                    style={{
                      borderColor:
                        "var(--brand-accent)",
                      backgroundColor:
                        "color-mix(in srgb, var(--brand-accent) 10%, white)",
                    }}
                  >

                    <Sparkles
                      size={17}
                      style={{
                        color:
                          "var(--brand-accent)",
                      }}
                    />

                  </div>


                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">

                    <div className="flex items-center gap-2">

                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />

                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />

                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />

                      <span className="ml-2 text-xs text-slate-400">
                        Thinking...
                      </span>

                    </div>

                  </div>

                </div>

              )}


              <div
                ref={bottomRef}
              />

            </div>

          )}

        </div>


        {/* =====================================================
            IMAGE SELECTED
           ===================================================== */}

        {imageFile && (

          <div className="mx-auto mb-3 flex w-full max-w-4xl items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">

            <ImageIcon
              size={17}
              className="text-emerald-500"
            />

            <span className="flex-1 truncate text-sm text-emerald-700">
              {imageFile.name}
            </span>

            <button
              type="button"
              onClick={() =>
                setImageFile(null)
              }
              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-100"
            >
              <X
                size={16}
              />
            </button>

          </div>

        )}


        {/* =====================================================
            INPUT
           ===================================================== */}

        <div className="mx-auto w-full max-w-4xl">

          <div
            className="flex items-center gap-2 rounded-2xl border bg-white p-3 shadow-sm transition focus-within:ring-4"
            style={{
              borderColor:
                "color-mix(in srgb, var(--brand-primary) 30%, #e2e8f0)",
            }}
          >

            <label
              className="cursor-pointer rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              title="Attach image"
            >

              <Paperclip
                size={20}
              />

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {

                  const file =
                    e.target.files?.[0];

                  if (file) {
                    setImageFile(
                      file
                    );
                  }

                  e.target.value =
                    "";

                }}
              />

            </label>


            <input
              value={message}
              onChange={(e) =>
                setMessage(
                  e.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Ask anything..."
              disabled={loading}
              className="flex-1 bg-transparent px-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
            />


            <button
              type="button"
              onClick={
                handleSend
              }
              disabled={
                loading ||
                (
                  !message.trim() &&
                  !imageFile
                )
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                backgroundColor:
                  "var(--brand-primary)",
                color:
                  "var(--brand-primary-text)",
              }}
              title="Send"
            >

              {loading ? (

                <Loader2
                  size={18}
                  className="animate-spin"
                />

              ) : (

                <Send
                  size={18}
                />

              )}

            </button>

          </div>


          <p className="mt-3 text-center text-[11px] text-slate-400">
            AI responses may not always be 100% accurate.
            Please verify important information.
          </p>

        </div>

      </div>

    </Layout>
  );
}