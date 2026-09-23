"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  Building2,
  Plus,
  Search,
  Trash2,
  Users,
  BriefcaseBusiness,
  X,
} from "lucide-react";

import {
  getDepartments,
  createDepartment,
  deleteDepartment,
} from "@/lib/course-api";

import { getCurrentUser } from "@/lib/current-user";


type Department = {
  id: number;
  company_id: number;
  department_name: string;
};


export default function DepartmentsPage() {

  const currentUser = getCurrentUser();

  const companyId = currentUser.companyId;

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [departmentName, setDepartmentName] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  // ==========================================================
  // LOAD DEPARTMENTS
  // ==========================================================

  useEffect(() => {

    if (companyId) {
      loadDepartments(companyId);
    } else {
      setLoading(false);
    }

  }, [companyId]);


  async function loadDepartments(id: number) {

    try {

      setLoading(true);

      const data =
        await getDepartments(id);

      setDepartments(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load departments:",
        error
      );

      setDepartments([]);

    } finally {

      setLoading(false);

    }

  }


  // ==========================================================
  // CREATE DEPARTMENT
  // ==========================================================

  async function handleCreate() {

    const name =
      departmentName.trim();

    if (!name) {

      alert(
        "Department name is required."
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
        await createDepartment(
          companyId,
          name
        );

      if (
        response?.success === false
      ) {

        alert(
          response?.message ||
          "Unable to create department."
        );

        return;

      }

      setDepartmentName("");

      setShowCreateForm(false);

      await loadDepartments(
        companyId
      );

    } catch (error: any) {

      console.error(
        "Create department error:",
        error
      );

      alert(
        error?.message ||
        "Failed to create department."
      );

    } finally {

      setSaving(false);

    }

  }


  // ==========================================================
  // DELETE DEPARTMENT
  // ==========================================================

  async function handleDelete(
    departmentId: number,
    name: string
  ) {

    const confirmed =
      window.confirm(
        `Delete "${name}"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {

      await deleteDepartment(
        departmentId
      );

      await loadDepartments(
        companyId
      );

    } catch (error: any) {

      console.error(
        "Delete department error:",
        error
      );

      alert(
        error?.message ||
        "Failed to delete department."
      );

    }

  }


  // ==========================================================
  // SEARCH
  // ==========================================================

  const filteredDepartments =
    useMemo(() => {

      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return departments;
      }

      return departments.filter(
        (department) =>
          department.department_name
            .toLowerCase()
            .includes(query)
      );

    }, [departments, search]);


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
              Departments
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

            Add Department

          </button>

        </div>


        {/* ==================================================
            SUMMARY
           ================================================== */}

        <div className="grid gap-4 md:grid-cols-3">


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Total Departments
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {departments.length}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

                <BriefcaseBusiness
                  size={21}
                />

              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Organization
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  Company #{companyId || "—"}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-500">

                <Building2
                  size={21}
                />

              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Management Status
                </p>

                <p className="mt-2 text-lg font-bold text-emerald-600">
                  Active
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">

                <Users
                  size={21}
                />

              </div>

            </div>

          </div>

        </div>


        {/* ==================================================
            CREATE FORM
           ================================================== */}

        {showCreateForm && (

          <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

              <div>

                <h2 className="text-base font-semibold text-slate-900">
                  Add New Department
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Create a department inside your organization.
                </p>

              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setDepartmentName("");
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >

                <X size={18} />

              </button>

            </div>


            <div className="p-6">

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Department Name
              </label>

              <div className="relative">

                <BriefcaseBusiness
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={departmentName}
                  onChange={(e) =>
                    setDepartmentName(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreate();
                    }
                  }}
                  placeholder="e.g. Human Resources"
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


              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setDepartmentName("");
                  }}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
                    : "Create Department"}

                </button>

              </div>

            </div>

          </div>

        )}


        {/* ==================================================
            SEARCH TOOLBAR
           ================================================== */}

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">

          <div className="relative w-full md:max-w-md">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search departments..."
              className="
                h-10
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
              "
            />

          </div>


          <p className="text-sm text-slate-500">

            Showing{" "}

            <span className="font-semibold text-slate-700">
              {filteredDepartments.length}
            </span>

            {" "}of{" "}

            <span className="font-semibold text-slate-700">
              {departments.length}
            </span>

            {" "}departments

          </p>

        </div>


        {/* ==================================================
            DEPARTMENT LIST
           ================================================== */}

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />

            <p className="mt-4 text-sm text-slate-500">
              Loading departments...
            </p>

          </div>

        ) : filteredDepartments.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">

            <BriefcaseBusiness
              size={36}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 text-base font-semibold text-slate-800">
              No departments found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search."
                : "Create your first department to get started."}
            </p>

          </div>

        ) : (

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {filteredDepartments.map(
              (department) => (

                <div
                  key={department.id}
                  className="
                    group
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-5
                    shadow-sm
                    transition
                    hover:-translate-y-0.5
                    hover:border-amber-200
                    hover:shadow-md
                  "
                >

                  {/* Card Header */}

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-100 to-amber-200 text-amber-700">

                        <BriefcaseBusiness
                          size={22}
                        />

                      </div>

                      <div className="min-w-0">

                        <h2 className="truncate text-base font-bold text-slate-900">
                          {department.department_name}
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Department #{department.id}
                        </p>

                      </div>

                    </div>


                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                      Active
                    </span>

                  </div>


                  {/* Details */}

                  <div className="mt-5 space-y-3">

                    <div className="flex items-center gap-3 text-sm text-slate-600">

                      <Building2
                        size={16}
                        className="text-slate-400"
                      />

                      Company #{department.company_id}

                    </div>


                    <div className="flex items-center gap-3 text-sm text-slate-600">

                      <Users
                        size={16}
                        className="text-slate-400"
                      />

                      Employees managed by this department

                    </div>

                  </div>


                  {/* Footer */}

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

                    <span className="text-xs text-slate-400">
                      Ready for department head assignment
                    </span>


                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          department.id,
                          department.department_name
                        )
                      }
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-lg
                        px-3
                        py-2
                        text-xs
                        font-semibold
                        text-red-500
                        transition
                        hover:bg-red-50
                        hover:text-red-600
                      "
                    >

                      <Trash2
                        size={14}
                      />

                      Delete

                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </DashboardLayout>

  );
}