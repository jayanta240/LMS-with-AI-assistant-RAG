"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  getDepartments,
  getDepartmentHeads,
  deleteDepartmentHead,
  registerUser,
} from "@/lib/course-api";

import { getCurrentUser } from "@/lib/current-user";

import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";


type Department = {
  id: number;
  company_id: number;
  department_name: string;
};

type DepartmentHead = {
  id: number;
  name: string;
  email: string;
  department_id: number | null;
  department: string;
};


export default function DepartmentHeadsPage() {

  const currentUser = getCurrentUser();

  const companyId = currentUser.companyId;

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [departmentHeads, setDepartmentHeads] =
    useState<DepartmentHead[]>([]);

  const [headsLoading, setHeadsLoading] =
    useState(true);

  const [departmentId, setDepartmentId] =
    useState("");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  // ==========================================================
  // LOAD DEPARTMENTS + DEPARTMENT HEADS
  // ==========================================================

  useEffect(() => {

    if (!companyId) {
      setLoading(false);
      setHeadsLoading(false);
      return;
    }

    loadData(companyId);

  }, [companyId]);


  async function loadData(id: number) {

    try {

      setLoading(true);
      setHeadsLoading(true);

      const [departmentData, headData] =
        await Promise.all([
          getDepartments(id),
          getDepartmentHeads(),
        ]);

      setDepartments(
        Array.isArray(departmentData)
          ? departmentData
          : []
      );

      setDepartmentHeads(
        Array.isArray(headData)
          ? headData
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load Department Heads page:",
        error
      );

      setDepartments([]);
      setDepartmentHeads([]);

    } finally {

      setLoading(false);
      setHeadsLoading(false);

    }

  }


  // ==========================================================
  // CREATE DEPARTMENT HEAD
  // ==========================================================

  async function handleCreate() {

    const cleanName =
      name.trim();

    const cleanEmail =
      email.trim();

    if (!cleanName) {

      alert(
        "Name is required."
      );

      return;

    }

    if (!cleanEmail) {

      alert(
        "Email is required."
      );

      return;

    }

    if (!password) {

      alert(
        "Password is required."
      );

      return;

    }

    if (!departmentId) {

      alert(
        "Please select a department."
      );

      return;

    }

    if (!companyId) {

      alert(
        "Company information is missing."
      );

      return;

    }

    try {

      setSaving(true);

      const response =
        await registerUser({

          name: cleanName,

          email: cleanEmail,

          password,

          role: "department_head",

          company_id: companyId,

          department_id:
            Number(departmentId),

        });


      if (response?.success === false) {

        alert(
          response?.message ||
          "Unable to create department head."
        );

        return;

      }


      const selectedDepartment =
        departments.find(
          (department) =>
            department.id ===
            Number(departmentId)
        );


      alert(
        `${cleanName} has been created as Department Head${
          selectedDepartment
            ? ` for ${selectedDepartment.department_name}`
            : ""
        }.`
      );


      setName("");

      setEmail("");

      setPassword("");

      setDepartmentId("");

      setShowCreateForm(false);

      setDepartmentHeads(
        await getDepartmentHeads()
      );

    } catch (error: any) {

      console.error(
        "Department head creation error:",
        error
      );

      alert(
        error?.message ||
        "Failed to create department head."
      );

    } finally {

      setSaving(false);

    }

  }


  // ==========================================================
  // SEARCH DEPARTMENT HEADS
  // ==========================================================

  const filteredHeads =
    useMemo(() => {

      const query =
        search.trim().toLowerCase();

      if (!query) {
        return departmentHeads;
      }

      return departmentHeads.filter(
        (head) =>
          head.name.toLowerCase().includes(query) ||
          head.email.toLowerCase().includes(query) ||
          head.department.toLowerCase().includes(query)
      );

    }, [departmentHeads, search]);


  async function handleDelete(head: DepartmentHead) {

    const confirmed = window.confirm(
      `Delete "${head.name}" (${head.email}) permanently?\\n\\nThis will remove the Department Head account from the database and cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {

      await deleteDepartmentHead(head.id);

      alert("Department Head deleted.");

      setDepartmentHeads(
        await getDepartmentHeads()
      );

    } catch (error: any) {

      alert(
        error?.message ||
        "Failed to delete Department Head."
      );

    }

  }


  return (

    <DashboardLayout>

      <div className="space-y-6">


        {/* ==================================================
            HEADER
           ================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-semibold text-amber-600">
              Organization Management
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Department Heads
            </h1>

          </div>


          <button
            type="button"
            onClick={() =>
              setShowCreateForm(true)
            }
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-slate-900
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-slate-800
            "
          >

            <Plus size={18} />

            Create Department Head

          </button>

        </div>


        {/* ==================================================
            CREATE PANEL
           ================================================== */}

        {showCreateForm && (

          <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

              <div>

                <h2 className="text-base font-semibold text-slate-900">
                  Create Department Head
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Create the account and assign the department.
                </p>

              </div>


              <button
                type="button"
                onClick={() => {

                  setShowCreateForm(false);

                  setName("");

                  setEmail("");

                  setPassword("");

                  setDepartmentId("");

                }}
                className="
                  rounded-lg
                  p-2
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                "
              >

                <X size={18} />

              </button>

            </div>


            <div className="p-6">

              <div className="grid gap-5 md:grid-cols-2">


                {/* Name */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Full Name
                  </label>

                  <div className="relative">

                    <UserRound
                      size={17}
                      className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      placeholder="Department head name"
                      className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        pl-10
                        pr-4
                        text-sm
                        outline-none
                        transition
                        focus:border-amber-400
                        focus:bg-white
                        focus:ring-2
                        focus:ring-amber-100
                      "
                    />

                  </div>

                </div>


                {/* Email */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>

                  <div className="relative">

                    <Mail
                      size={17}
                      className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="head@company.com"
                      className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        pl-10
                        pr-4
                        text-sm
                        outline-none
                        transition
                        focus:border-amber-400
                        focus:bg-white
                        focus:ring-2
                        focus:ring-amber-100
                      "
                    />

                  </div>

                </div>


                {/* Password */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Temporary Password
                  </label>

                  <div className="relative">

                    <LockKeyhole
                      size={17}
                      className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Create a password"
                      className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        pl-10
                        pr-11
                        text-sm
                        outline-none
                        transition
                        focus:border-amber-400
                        focus:bg-white
                        focus:ring-2
                        focus:ring-amber-100
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) => !current
                        )
                      }
                      className="
                        absolute
                        right-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                        hover:text-slate-700
                      "
                    >

                      {showPassword
                        ? <EyeOff size={17} />
                        : <Eye size={17} />}

                    </button>

                  </div>

                </div>


                {/* Department */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Department
                  </label>

                  <div className="relative">

                    <BriefcaseBusiness
                      size={17}
                      className="
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <select
                      value={departmentId}
                      onChange={(e) =>
                        setDepartmentId(
                          e.target.value
                        )
                      }
                      className="
                        h-11
                        w-full
                        appearance-none
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        pl-10
                        pr-4
                        text-sm
                        text-slate-700
                        outline-none
                        transition
                        focus:border-amber-400
                        focus:bg-white
                        focus:ring-2
                        focus:ring-amber-100
                      "
                    >

                      <option value="">
                        Select Department
                      </option>

                      {departments.map(
                        (department) => (

                          <option
                            key={department.id}
                            value={department.id}
                          >
                            {
                              department.department_name
                            }
                          </option>

                        )
                      )}

                    </select>

                  </div>

                </div>

              </div>


              {/* Company Information */}

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">

                <div className="flex items-start gap-3">

                  <Building2
                    size={18}
                    className="mt-0.5 text-blue-500"
                  />

                  <div>

                    <p className="text-sm font-semibold text-blue-900">
                      Organization Assignment
                    </p>

                    <p className="mt-1 text-xs text-blue-700">
                      This account will belong to company #{companyId}
                      and will manage the selected department.
                    </p>

                  </div>

                </div>

              </div>


              {/* Actions */}

              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() => {

                    setShowCreateForm(false);

                    setName("");

                    setEmail("");

                    setPassword("");

                    setDepartmentId("");

                  }}
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    px-5
                    py-2.5
                    text-sm
                    font-medium
                    text-slate-600
                    hover:bg-slate-50
                  "
                >
                  Cancel
                </button>


                <button
                  type="button"
                  disabled={saving}
                  onClick={handleCreate}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-slate-900
                    px-5
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-slate-800
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >

                  <Plus size={17} />

                  {saving
                    ? "Creating..."
                    : "Create Department Head"}

                </button>

              </div>

            </div>

          </div>

        )}


        {/* ==================================================
            DEPARTMENT HEAD LIST
           ================================================== */}

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">

          <div className="relative w-full md:max-w-md">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search department heads..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-amber-400 focus:bg-white"
            />

          </div>

          <p className="text-sm text-slate-500">
            {headsLoading
              ? "Loading..."
              : `Total: ${filteredHeads.length}`}
          </p>

        </div>

        {headsLoading ? (

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />

            <p className="mt-4 text-sm text-slate-500">
              Loading Department Heads...
            </p>

          </div>

        ) : filteredHeads.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">

            <ShieldCheck
              size={36}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 text-base font-semibold text-slate-800">
              No Department Heads found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create the first Department Head using the button above.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">

            <table className="min-w-full text-left">

              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">

                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Gmail / Email</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Department ID</th>
                  <th className="px-4 py-3 text-right">Action</th>

                </tr>
              </thead>

              <tbody>

                {filteredHeads.map((head) => (

                  <tr
                    key={head.id}
                    className="border-b border-slate-100 last:border-0"
                  >

                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">
                        {head.name || "Unnamed"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-600">
                        {head.email || "No email"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-800">
                        {head.department || "No department"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-500">
                        {head.department_id ?? "-"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">

                      <button
                        type="button"
                        onClick={() => handleDelete(head)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                      >
                        Delete
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </DashboardLayout>

  );
}