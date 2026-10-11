"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  getDepartments,
  registerUser,
  getUsers,
  getCourses,
  assignCourse,
  getDepartmentHeads,
  registerEmployee,
  getNextEmployeeId,
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
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  ImagePlus,
  RefreshCw,
  Check,
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

const EMPLOYMENT_TYPES = [
  "Permanent",
  "Contract",
  "Intern",
  "Part-time",
  "Consultant",
  "Temporary",
  "Other",
];

const EMPLOYMENT_STATUSES = [
  "Active",
  "Inactive",
  "Notice Period",
];

const GENDERS = [
  "Male",
  "Female",
  "Other",
];


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

  type CreateStep = 1 | 2 | 3;

  const [createStep, setCreateStep] =
    useState<CreateStep>(1);

  const [employeeId, setEmployeeId] =
    useState("");

  const [firstName, setFirstName] =
    useState("");

  const [middleName, setMiddleName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [gender, setGender] =
    useState("");

  const [dateOfBirth, setDateOfBirth] =
    useState("");

  const [profilePhoto, setProfilePhoto] =
    useState<File | null>(null);

  const [profilePhotoPreview, setProfilePhotoPreview] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [autoGeneratePassword, setAutoGeneratePassword] =
    useState(true);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [mobileNumber, setMobileNumber] =
    useState("");

  const [employmentType, setEmploymentType] =
    useState("");

  const [employmentStatus, setEmploymentStatus] =
    useState("");

  const [dateOfJoining, setDateOfJoining] =
    useState("");

  const [dateOfConfirmation, setDateOfConfirmation] =
    useState("");

  const [dateOfExit, setDateOfExit] =
    useState("");

  const [designation, setDesignation] =
    useState("");

  const [departmentId, setDepartmentId] =
    useState("");

  const [departmentHeadId, setDepartmentHeadId] =
    useState("");

  const [departmentHeads, setDepartmentHeads] =
    useState<any[]>([]);

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const employeeName = useMemo(
    () =>
      [firstName, middleName, lastName]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(" "),
    [firstName, middleName, lastName]
  );

  useEffect(() => {
    if (!profilePhoto) {
      setProfilePhotoPreview("");
      return;
    }

    const url = URL.createObjectURL(profilePhoto);
    setProfilePhotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [profilePhoto]);


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
        loadDepartmentHeads(),
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


  async function loadDepartmentHeads() {
    const data =
      await getDepartmentHeads();

    setDepartmentHeads(
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

  async function openCreateForm() {
    setCreateStep(1);
    setShowCreateForm(true);
    setDepartmentHeadId("");
    setProfilePhoto(null);
    setProfilePhotoPreview("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setMobileNumber("");
    setEmploymentType("");
    setEmploymentStatus("");
    setDateOfJoining("");
    setDateOfConfirmation("");
    setDateOfExit("");
    setDesignation("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setGender("");

    if (companyId) {
      try {
        const result = await getNextEmployeeId(companyId);
        setEmployeeId(result?.employee_id || "");
      } catch (error) {
        console.error("Failed to generate Employee ID:", error);
        setEmployeeId("");
      }
    }
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateStep(1);
    setProfilePhoto(null);
    setProfilePhotoPreview("");
  }

  function handlePhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Profile photo must be JPG or PNG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Profile photo must be smaller than 5 MB.");
      return;
    }

    setProfilePhoto(file);
  }

  async function handleDepartmentChange(
    value: string
  ) {
    setDepartmentId(value);
    setDepartmentHeadId("");

    if (!value) {
      setDepartmentHeads([]);
      return;
    }

    if (
      currentUser.role === "department_head"
    ) {
      setDepartmentHeads([
        {
          id: currentUser.userId,
          name: currentUser.name || "Department Head",
          department_id: currentUser.departmentId,
          department: "",
        },
      ]);
      setDepartmentHeadId(
        String(currentUser.userId)
      );
      return;
    }

    try {
      const data =
        await getDepartmentHeads(
          Number(value)
        );

      setDepartmentHeads(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load Department Heads:",
        error
      );
      setDepartmentHeads([]);
    }
  }

  function validateStepOne() {
    if (!employeeId.trim()) {
      alert("Employee ID is required.");
      return false;
    }

    if (!firstName.trim()) {
      alert("First Name is required.");
      return false;
    }

    if (!lastName.trim()) {
      alert("Last Name is required.");
      return false;
    }

    if (!gender) {
      alert("Gender is required.");
      return false;
    }

    if (!dateOfBirth) {
      alert("Date of Birth is required.");
      return false;
    }

    return true;
  }

  function validateStepTwo() {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      alert("Login Email is required.");
      return false;
    }

    if (!password) {
      alert("Password is required.");
      return false;
    }

    if (password.length < 8) {
      alert("Password must contain at least 8 characters.");
      return false;
    }

    if (password !== confirmPassword) {
      alert("Password and Confirm Password must match.");
      return false;
    }

    const mobile =
      mobileNumber.replace(/\D/g, "");

    if (
      mobile.length < 7 ||
      mobile.length > 15
    ) {
      alert("Please enter a valid mobile number.");
      return false;
    }

    return true;
  }

  function validateStepThree() {
    if (!employmentType) {
      alert("Employment Type is required.");
      return false;
    }

    if (!employmentStatus) {
      alert("Employment Status is required.");
      return false;
    }

    if (!dateOfJoining) {
      alert("Date of Joining is required.");
      return false;
    }

    if (!designation.trim()) {
      alert("Designation is required.");
      return false;
    }

    if (!departmentId) {
      alert("Department is required.");
      return false;
    }

    if (!departmentHeadId) {
      alert("Department Head is required.");
      return false;
    }

    if (
      dateOfConfirmation &&
      dateOfJoining > dateOfConfirmation
    ) {
      alert(
        "Date of Confirmation cannot be before Date of Joining."
      );
      return false;
    }

    if (
      dateOfExit &&
      dateOfJoining > dateOfExit
    ) {
      alert(
        "Date of Exit cannot be before Date of Joining."
      );
      return false;
    }

    return true;
  }

  function nextStep() {
    if (
      createStep === 1 &&
      validateStepOne()
    ) {
      setCreateStep(2);
      return;
    }

    if (
      createStep === 2 &&
      validateStepTwo()
    ) {
      setCreateStep(3);
    }
  }

  function previousStep() {
    setCreateStep(
      (current) =>
        current === 1
          ? 1
          : ((current - 1) as CreateStep)
    );
  }

  async function handleCreate() {
    if (!validateStepThree()) {
      return;
    }

    try {
      setSaving(true);

      const response =
        await registerEmployee({
          employee_id: employeeId.trim(),
          employee_name: employeeName,
          first_name: firstName.trim(),
          middle_name: middleName.trim(),
          last_name: lastName.trim(),
          gender,
          date_of_birth: dateOfBirth,
          profile_photo: profilePhoto,
          email: email.trim(),
          password,
          confirm_password: confirmPassword,
          mobile_number: mobileNumber.trim(),
          employment_type: employmentType,
          employment_status: employmentStatus,
          date_of_joining: dateOfJoining,
          date_of_confirmation: dateOfConfirmation,
          date_of_exit: dateOfExit,
          designation: designation.trim(),
          department_id: Number(departmentId),
          department_head_id: Number(departmentHeadId),
        });

      if (response?.success === false) {
        alert(
          response?.message ||
            "Unable to create employee."
        );
        return;
      }

      alert(
        employeeName +
          " was created successfully.\n\nEmployee ID: " +
          (response?.employee_id || employeeId)
      );

      closeCreateForm();
      await Promise.all([
        loadUsers(),
        loadDepartments(companyId),
        loadDepartmentHeads(),
      ]);
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

          </div>


          <button
            type="button"
            onClick={openCreateForm}
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

        </div>

      </div>

    </DashboardLayout>

  );
}