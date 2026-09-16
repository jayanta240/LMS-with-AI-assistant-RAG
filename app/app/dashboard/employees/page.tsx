"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  getDepartments,
  registerUser,
  getUsers,
  getCourses,
  assignCourse,
} from "@/lib/course-api";

import { getCurrentUser } from "@/lib/current-user";

import {
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
  X,
  ChevronDown,
} from "lucide-react";


type Department = {
  id: number;
  department_name: string;
  company_id?: number;
};


type Employee = {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string;
  department_id?: number;
  company_id?: number;
  progress?: number;
};


type Course = {
  id: number;
  title: string;
};


export default function EmployeesPage() {

  const currentUser = getCurrentUser();

  const companyId = currentUser.companyId;


  // ==========================================================
  // DATA
  // ==========================================================

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [users, setUsers] =
    useState<Employee[]>([]);

  const [courses, setCourses] =
    useState<Course[]>([]);


  // ==========================================================
  // CREATE EMPLOYEE FORM
  // ==========================================================

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [departmentId, setDepartmentId] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showCreateForm, setShowCreateForm] =
    useState(false);


  // ==========================================================
  // ASSIGN COURSE
  // ==========================================================

  const [selectedCourse, setSelectedCourse] =
    useState<Record<number, number>>({});

  const [assigningUserId, setAssigningUserId] =
    useState<number | null>(null);


  // ==========================================================
  // PAGE STATE
  // ==========================================================

  const [search, setSearch] =
    useState("");

  const [departmentFilter, setDepartmentFilter] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {

    if (!companyId) {
      setLoading(false);
      return;
    }

    loadAll();

  }, [companyId]);


  async function loadAll() {

    try {

      setLoading(true);

      await Promise.all([
        loadDepartments(companyId),
        loadUsers(),
        loadCourses(),
      ]);

    } catch (error) {

      console.error(
        "Failed to load employee management data:",
        error
      );

    } finally {

      setLoading(false);

    }

  }


  async function loadDepartments(
    id: number
  ) {

    const data =
      await getDepartments(id);

    setDepartments(
      Array.isArray(data)
        ? data
        : []
    );

  }


  async function loadUsers() {

    const data =
      await getUsers();

    setUsers(
      Array.isArray(data)
        ? data
        : []
    );

  }


  async function loadCourses() {

    const data =
      await getCourses();

    setCourses(
      Array.isArray(data)
        ? data
        : []
    );

  }


  // ==========================================================
  // CREATE EMPLOYEE
  // ==========================================================

  async function handleCreate() {

    const cleanName =
      name.trim();

    const cleanEmail =
      email.trim();

    if (!cleanName) {

      alert(
        "Employee name is required."
      );

      return;

    }

    if (!cleanEmail) {

      alert(
        "Employee email is required."
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

          role: "employee",

          company_id: companyId,

          department_id:
            Number(departmentId),

        });


      if (response?.success === false) {

        alert(
          response?.message ||
          "Unable to create employee."
        );

        return;

      }


      alert(
        `${cleanName} was created successfully.`
      );


      setName("");

      setEmail("");

      setPassword("");

      setDepartmentId("");

      setShowCreateForm(false);

      await loadUsers();

    } catch (error: any) {

      console.error(
        "Employee creation error:",
        error
      );

      alert(
        error?.message ||
        "Failed to create employee."
      );

    } finally {

      setSaving(false);

    }

  }


  // ==========================================================
  // ASSIGN COURSE
  // ==========================================================

  async function handleAssignCourse(
    userId: number
  ) {

    const courseId =
      selectedCourse[userId];


    if (!courseId) {

      alert(
        "Please select a course."
      );

      return;

    }


    try {

      setAssigningUserId(userId);

      const response =
        await assignCourse(
          userId,
          courseId
        );


      if (response?.success === false) {

        alert(
          response?.message ||
          "Unable to assign course."
        );

        return;

      }


      alert(
        "Course assigned successfully."
      );


      setSelectedCourse(
        (current) => ({
          ...current,
          [userId]: 0,
        })
      );


      await loadUsers();

    } catch (error: any) {

      console.error(
        "Course assignment error:",
        error
      );

      alert(
        error?.message ||
        "Unable to assign course."
      );

    } finally {

      setAssigningUserId(null);

    }

  }


  // ==========================================================
  // FILTERED USERS
  // ==========================================================

  const filteredUsers =
    useMemo(() => {

      const query =
        search.trim().toLowerCase();


      return users.filter(
        (user) => {

          const matchesSearch =
            !query ||
            user.name
              ?.toLowerCase()
              .includes(query) ||
            user.email
              ?.toLowerCase()
              .includes(query);


          const matchesDepartment =
            !departmentFilter ||
            String(
              user.department_id ??
              ""
            ) ===
              departmentFilter;


          return (
            matchesSearch &&
            matchesDepartment
          );

        }
      );

    }, [
      users,
      search,
      departmentFilter,
    ]);


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const totalEmployees =
    users.filter(
      (user) =>
        user.role === "employee"
    ).length;


  const activeProgressUsers =
    users.filter(
      (user) =>
        Number(user.progress ?? 0) > 0
    ).length;


  const completedUsers =
    users.filter(
      (user) =>
        Number(user.progress ?? 0) >= 100
    ).length;


  return (

    <DashboardLayout>

      <div className="space-y-6">


        {/* ==================================================
            HEADER
           ================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-semibold text-amber-600">
              User Management
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Employees
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create employees, manage department assignments,
              track learning progress, and assign courses.
            </p>

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

            <UserPlus size={18} />

            Add Employee

          </button>

        </div>


        {/* ==================================================
            SUMMARY CARDS
           ================================================== */}

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Employees
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {totalEmployees}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                <UserRound size={21} />

              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Learning Started
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {activeProgressUsers}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

                <GraduationCap size={21} />

              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Fully Completed
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {completedUsers}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">

                <CheckCircle2 size={21} />

              </div>

            </div>

          </div>

        </div>


        {/* ==================================================
            CREATE EMPLOYEE PANEL
           ================================================== */}

        {showCreateForm && (

          <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

              <div>

                <h2 className="text-base font-semibold text-slate-900">
                  Add New Employee
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Create an employee account and assign a department.
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
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >

                <X size={18} />

              </button>

            </div>


            <div className="p-6">

              <div className="grid gap-5 md:grid-cols-2">


                {/* Name */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Employee Name
                  </label>

                  <div className="relative">

                    <UserRound
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      placeholder="Full name"
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="employee@company.com"
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

                    <ShieldCheck
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                        pr-10
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

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                  </div>

                </div>

              </div>


              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">

                <div className="flex items-start gap-3">

                  <BriefcaseBusiness
                    size={18}
                    className="mt-0.5 text-blue-500"
                  />

                  <div>

                    <p className="text-sm font-semibold text-blue-900">
                      Company Assignment
                    </p>

                    <p className="mt-1 text-xs text-blue-700">
                      The employee will be created under
                      company #{companyId}.
                    </p>

                  </div>

                </div>

              </div>


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
                    : "Create Employee"}

                </button>

              </div>

            </div>

          </div>

        )}


        {/* ==================================================
            FILTER TOOLBAR
           ================================================== */}

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">

          <div className="relative w-full lg:max-w-md">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search employees by name or email..."
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


          <div className="flex flex-col gap-3 sm:flex-row">

            <select
              value={departmentFilter}
              onChange={(e) =>
                setDepartmentFilter(
                  e.target.value
                )
              }
              className="
                h-10
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                px-4
                text-sm
                text-slate-600
                outline-none
                focus:border-amber-400
              "
            >

              <option value="">
                All Departments
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


            <span className="flex items-center justify-center rounded-xl bg-slate-50 px-4 text-sm text-slate-500">

              {filteredUsers.length} employee
              {filteredUsers.length === 1
                ? ""
                : "s"}

            </span>

          </div>

        </div>


        {/* ==================================================
            EMPLOYEE TABLE
           ================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-base font-semibold text-slate-900">
                  Employee Directory
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  View employees, departments, progress, and course assignments.
                </p>

              </div>

              <div className="hidden items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:flex">

                <UserRound size={14} />

                Company #{companyId}

              </div>

            </div>

          </div>


          {loading ? (

            <div className="px-6 py-14 text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />

              <p className="mt-4 text-sm text-slate-500">
                Loading employees...
              </p>

            </div>

          ) : filteredUsers.length === 0 ? (

            <div className="px-6 py-14 text-center">

              <UserRound
                size={36}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 text-base font-semibold text-slate-800">
                No employees found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {search || departmentFilter
                  ? "Try changing your search or department filter."
                  : "Create your first employee to get started."}
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-[1000px] w-full">

                <thead>

                  <tr className="border-b border-slate-100 bg-slate-50">

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Employee
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Department
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Progress
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Course Assignment
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredUsers.map(
                    (user) => {

                      const progress =
                        Math.max(
                          0,
                          Math.min(
                            100,
                            Number(
                              user.progress ??
                              0
                            )
                          )
                        );


                      return (

                        <tr
                          key={user.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                        >

                          {/* Employee */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-amber-200 text-sm font-bold text-slate-800">

                                {user.name
                                  ?.split(" ")
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map(
                                    (part) =>
                                      part[0]
                                  )
                                  .join("")
                                  .toUpperCase() ||
                                  "U"}

                              </div>


                              <div className="min-w-0">

                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {user.name}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {user.email}
                                </p>

                              </div>

                            </div>

                          </td>


                          {/* Department */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2">

                              <BriefcaseBusiness
                                size={15}
                                className="text-slate-400"
                              />

                              <span className="text-sm text-slate-600">
                                {user.department ||
                                  "Not assigned"}
                              </span>

                            </div>

                          </td>


                          {/* Progress */}

                          <td className="px-5 py-4">

                            <div className="w-40">

                              <div className="mb-1.5 flex items-center justify-between">

                                <span className="text-xs font-semibold text-slate-700">
                                  {progress}%
                                </span>

                                <span className="text-[10px] text-slate-400">
                                  Learning
                                </span>

                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500"
                                  style={{
                                    width: `${progress}%`,
                                  }}
                                />

                              </div>

                            </div>

                          </td>


                          {/* Course */}

                          <td className="px-5 py-4">

                            <select
                              value={
                                selectedCourse[
                                  user.id
                                ] || ""
                              }
                              onChange={(e) =>
                                setSelectedCourse(
                                  (current) => ({
                                    ...current,
                                    [user.id]:
                                      Number(
                                        e.target.value
                                      ),
                                  })
                                )
                              }
                              className="
                                h-9
                                w-56
                                rounded-lg
                                border
                                border-slate-200
                                bg-white
                                px-3
                                text-xs
                                text-slate-600
                                outline-none
                                focus:border-amber-400
                              "
                            >

                              <option value="">
                                Select Course
                              </option>

                              {courses.map(
                                (course) => (

                                  <option
                                    key={course.id}
                                    value={course.id}
                                  >
                                    {course.title}
                                  </option>

                                )
                              )}

                            </select>

                          </td>


                          {/* Action */}

                          <td className="px-5 py-4 text-right">

                            <button
                              type="button"
                              disabled={
                                assigningUserId ===
                                user.id
                              }
                              onClick={() =>
                                handleAssignCourse(
                                  user.id
                                )
                              }
                              className="
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                rounded-lg
                                bg-slate-900
                                px-3
                                py-2
                                text-xs
                                font-semibold
                                text-white
                                transition
                                hover:bg-slate-800
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >

                              {assigningUserId ===
                              user.id
                                ? "Assigning..."
                                : "Assign Course"}

                            </button>

                          </td>

                        </tr>

                      );

                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* ==================================================
            FOOTER NOTE
           ================================================== */}

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">

          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0 text-emerald-500"
          />

          <div>

            <p className="text-sm font-medium text-slate-700">
              Company-scoped employee management
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Employee records returned by the backend are restricted
              according to the logged-in administrator&apos;s permissions.
              Course assignment also follows the backend authorization rules.
            </p>

          </div>

        </div>

      </div>

    </DashboardLayout>

  );
}