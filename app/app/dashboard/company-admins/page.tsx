"use client";

import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getCompanies,
  getCompanyAdmins,
  deleteCompanyAdmin,
  registerCompanyAdmin,
  getNextEmployeeId,
} from "@/lib/course-api";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

type Step = 1 | 2 | 3;

type Company = {
  id: number;
  company_name: string;
};

type Admin = {
  id: number;
  name: string;
  email: string;
  company_id: number;
  company?: string;
  employee_id?: string;
  profile_photo_url?: string;
  created_at?: string;
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

const GENDERS = ["Male", "Female", "Other"];

function generatePassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "@#$%&*";
  const all = letters + numbers + symbols;

  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);

  let password =
    "Aa" +
    numbers[bytes[0] % numbers.length] +
    symbols[bytes[1] % symbols.length];

  for (let i = password.length; i < 12; i += 1) {
    password += all[bytes[i] % all.length];
  }

  return password;
}

export default function CompanyAdminsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState<Step>(1);

  const [companyId, setCompanyId] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [mobileNumber, setMobileNumber] = useState("");

  const [employmentType, setEmploymentType] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [dateOfConfirmation, setDateOfConfirmation] = useState("");
  const [dateOfExit, setDateOfExit] = useState("");
  const [designation, setDesignation] = useState("");

  const [passwordGenerated, setPasswordGenerated] = useState(false);

  const employeeName = useMemo(
    () =>
      [firstName, middleName, lastName]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(" "),
    [firstName, middleName, lastName]
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!autoGeneratePassword) {
      setPasswordGenerated(false);
      return;
    }

    const next = generatePassword();
    setPassword(next);
    setConfirmPassword(next);
    setPasswordGenerated(true);
  }, [autoGeneratePassword]);

  useEffect(() => {
    if (!profilePhoto) {
      setProfilePhotoPreview("");
      return;
    }

    const url = URL.createObjectURL(profilePhoto);
    setProfilePhotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [profilePhoto]);

  async function loadData() {
    try {
      setLoadingAdmins(true);

      const [companiesData, adminsData] = await Promise.all([
        getCompanies(),
        getCompanyAdmins(),
      ]);

      setCompanies(
        Array.isArray(companiesData) ? companiesData : []
      );

      setAdmins(
        Array.isArray(adminsData) ? adminsData : []
      );
    } catch (error) {
      console.error("Failed to load Company Admins page:", error);
      setCompanies([]);
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  }

  async function refreshEmployeeId() {
    if (!companyId) {
      alert("Please select a company first.");
      return;
    }

    try {
      const result = await getNextEmployeeId(Number(companyId));
      setEmployeeId(result?.employee_id || "");
    } catch (error: any) {
      alert(error?.message || "Failed to generate Employee ID.");
    }
  }

  async function handleCompanyChange(value: string) {
    setCompanyId(value);
    setEmployeeId("");

    if (!value) {
      return;
    }

    try {
      const result = await getNextEmployeeId(Number(value));
      setEmployeeId(result?.employee_id || "");
    } catch (error) {
      console.error("Failed to generate employee ID:", error);
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
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

  function validateStepOne() {
    if (!companyId) {
      alert("Please select a company.");
      return false;
    }

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
    if (!email.trim()) {
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

    const mobile = mobileNumber.replace(/\D/g, "");
    if (!mobile || mobile.length < 7 || mobile.length > 15) {
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

    if (dateOfConfirmation && dateOfJoining > dateOfConfirmation) {
      alert("Date of Confirmation cannot be before Date of Joining.");
      return false;
    }

    if (dateOfExit && dateOfJoining > dateOfExit) {
      alert("Date of Exit cannot be before Date of Joining.");
      return false;
    }

    return true;
  }

  function nextStep() {
    if (step === 1 && validateStepOne()) {
      setStep(2);
      return;
    }

    if (step === 2 && validateStepTwo()) {
      setStep(3);
    }
  }

  function previousStep() {
    setStep((current) =>
      current === 1 ? 1 : ((current - 1) as Step)
    );
  }

  async function handleCreate() {
    if (!validateStepThree()) {
      return;
    }

    try {
      setSaving(true);

      const result = await registerCompanyAdmin({
        company_id: Number(companyId),
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
        mobile_number: mobileNumber.trim(),
        employment_type: employmentType,
        employment_status: employmentStatus,
        date_of_joining: dateOfJoining,
        date_of_confirmation: dateOfConfirmation,
        date_of_exit: dateOfExit,
        designation: designation.trim(),
      });

      alert(
        "Company Admin created successfully.\n\nEmployee ID: " +
          (result?.employee_id || employeeId)
      );

      resetForm();
      await loadData();
    } catch (error: any) {
      alert(
        error?.message ||
          "Failed to create Company Admin."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setStep(1);
    setCompanyId("");
    setEmployeeId("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setGender("");
    setDateOfBirth("");
    setProfilePhoto(null);
    setEmail("");
    const nextPassword = generatePassword();
    setPassword(nextPassword);
    setConfirmPassword(nextPassword);
    setMobileNumber("");
    setEmploymentType("");
    setEmploymentStatus("");
    setDateOfJoining("");
    setDateOfConfirmation("");
    setDateOfExit("");
    setDesignation("");
    setAutoGeneratePassword(true);
    setPasswordGenerated(false);
  }

  async function handleDelete(admin: Admin) {
    const confirmed = window.confirm(
      "Delete " +
        JSON.stringify(admin.name) +
        " (" +
        admin.email +
        ") permanently?\n\nThis will remove the Company Admin account from the database and cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCompanyAdmin(admin.id);
      alert("Company Admin deleted.");
      await loadData();
    } catch (error: any) {
      alert(
        error?.message ||
          "Failed to delete Company Admin."
      );
    }
  }

  const steps = [
    {
      number: 1,
      title: "Basic Information",
      description: "Identity and profile",
    },
    {
      number: 2,
      title: "Login Information",
      description: "Credentials and contact",
    },
    {
      number: 3,
      title: "Employment Details",
      description: "Work profile",
    },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={20}
                className="text-slate-500"
              />
              <span className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                Administration
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Company Admins
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Create and manage Company Admin accounts with complete identity,
              login and employment information.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <Users size={16} className="text-slate-400" />
            {admins.length} Company Admin{admins.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Register Company Admin
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Complete all mandatory fields before creating the account.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {steps.map((item) => (
                    <div
                      key={item.number}
                      className={
                        "flex items-center gap-2 rounded-xl border px-3 py-2 " +
                        (step === item.number
                          ? "border-slate-300 bg-slate-50"
                          : "border-slate-100 bg-white")
                      }
                    >
                      <div
                        className={
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold " +
                          (step === item.number
                            ? "bg-slate-900 text-white"
                            : step > item.number
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-400")
                        }
                      >
                        {step > item.number ? (
                          <Check size={14} />
                        ) : (
                          item.number
                        )}
                      </div>

                      <div className="hidden lg:block">
                        <p className="text-xs font-semibold text-slate-700">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Basic Information
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Identity details and profile photo.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Company" required>
                      <select
                        value={companyId}
                        onChange={(event) =>
                          handleCompanyChange(event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">Select Company</option>
                        {companies.map((company) => (
                          <option
                            key={company.id}
                            value={company.id}
                          >
                            {company.company_name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      label="Employee ID"
                      required
                      hint="System-generated unique ID"
                    >
                      <div className="flex gap-2">
                        <input
                          value={employeeId}
                          readOnly
                          placeholder="Select company to generate"
                          className={inputClass + " flex-1 bg-slate-50"}
                        />
                        <button
                          type="button"
                          onClick={refreshEmployeeId}
                          disabled={!companyId}
                          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Generate another Employee ID"
                        >
                          <RefreshCw size={17} />
                        </button>
                      </div>
                    </Field>

                    <Field
                      label="Employee Name"
                      required
                      hint="Automatically built from the name fields"
                    >
                      <input
                        value={employeeName}
                        readOnly
                        placeholder="Enter first and last name"
                        className={inputClass + " bg-slate-50"}
                      />
                    </Field>

                    <Field label="Gender" required>
                      <select
                        value={gender}
                        onChange={(event) => setGender(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select Gender</option>
                        {GENDERS.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="First Name" required>
                      <input
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder="First name"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Middle Name">
                      <input
                        value={middleName}
                        onChange={(event) => setMiddleName(event.target.value)}
                        placeholder="Middle name (optional)"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Last Name" required>
                      <input
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder="Last name"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Date of Birth" required>
                      <DateInput
                        value={dateOfBirth}
                        onChange={setDateOfBirth}
                      />
                    </Field>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {profilePhotoPreview ? (
                          <img
                            src={profilePhotoPreview}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImagePlus
                            size={28}
                            className="text-slate-300"
                          />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          Profile Photo
                          <span className="ml-1 text-[11px] font-normal text-slate-400">
                            (Optional)
                          </span>
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Upload a JPG or PNG image. Maximum size: 5 MB.
                          This photo will be used in the user profile/header.
                          If no photo is uploaded, the system will show initials.
                        </p>

                        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                          <ImagePlus size={16} />
                          {profilePhoto ? "Change Photo" : "Upload Photo"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            onChange={handlePhotoChange}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Login Information
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      The email is used for the existing platform login system.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      label="Login Email"
                      required
                      hint="Required for sign in"
                    >
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="admin@example.com"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Mobile Number" required>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={mobileNumber}
                        onChange={(event) =>
                          setMobileNumber(
                            event.target.value.replace(/[^0-9+() -]/g, "")
                          )
                        }
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </Field>

                    <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Password
                            <span className="ml-1 text-red-500">*</span>
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {autoGeneratePassword
                              ? "A secure password is generated automatically."
                              : "Enter a password manually."}
                          </p>
                        </div>

                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={autoGeneratePassword}
                            onChange={(event) =>
                              setAutoGeneratePassword(event.target.checked)
                            }
                          />
                          Auto-generate password
                        </label>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <PasswordInput
                          label="Password"
                          value={password}
                          onChange={setPassword}
                          show={showPassword}
                          onToggle={() => setShowPassword((current) => !current)}
                          readOnly={autoGeneratePassword}
                        />

                        <PasswordInput
                          label="Confirm Password"
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          show={showConfirmPassword}
                          onToggle={() =>
                            setShowConfirmPassword((current) => !current)
                          }
                          readOnly={autoGeneratePassword}
                        />
                      </div>

                      {autoGeneratePassword && passwordGenerated && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = generatePassword();
                            setPassword(next);
                            setConfirmPassword(next);
                          }}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white"
                        >
                          <RefreshCw size={13} />
                          Generate another password
                        </button>
                      )}

                      <p className="mt-3 text-[11px] text-slate-400">
                        Password must contain at least 8 characters.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Employment Details
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Work information for the Company Admin profile.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Employment Type" required>
                      <select
                        value={employmentType}
                        onChange={(event) =>
                          setEmploymentType(event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">Select Employment Type</option>
                        {EMPLOYMENT_TYPES.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Employment Status" required>
                      <select
                        value={employmentStatus}
                        onChange={(event) =>
                          setEmploymentStatus(event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">Select Employment Status</option>
                        {EMPLOYMENT_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Date of Joining" required>
                      <DateInput
                        value={dateOfJoining}
                        onChange={setDateOfJoining}
                      />
                    </Field>

                    <Field label="Date of Confirmation">
                      <DateInput
                        value={dateOfConfirmation}
                        onChange={setDateOfConfirmation}
                      />
                    </Field>

                    <Field label="Date of Exit">
                      <DateInput
                        value={dateOfExit}
                        onChange={setDateOfExit}
                      />
                    </Field>

                    <Field label="Designation" required>
                      <input
                        value={designation}
                        onChange={(event) =>
                          setDesignation(event.target.value)
                        }
                        placeholder="e.g. Company Administrator"
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Registration Summary
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <SummaryItem
                        label="Employee ID"
                        value={employeeId || "Not generated"}
                      />
                      <SummaryItem
                        label="Employee Name"
                        value={employeeName || "Not provided"}
                      />
                      <SummaryItem
                        label="Company"
                        value={
                          companies.find(
                            (company) =>
                              String(company.id) === companyId
                          )?.company_name || "Not selected"
                        }
                      />
                      <SummaryItem
                        label="Login Email"
                        value={email || "Not provided"}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={previousStep}
                  disabled={step === 1 || saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Create Company Admin
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">
                Existing Company Admins
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Accounts already registered on the platform.
              </p>
            </div>

            <div className="p-4">
              {loadingAdmins ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  Loading Company Admins...
                </div>
              ) : admins.length === 0 ? (
                <div className="py-10 text-center">
                  <Users
                    size={28}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 font-semibold text-slate-700">
                    No Company Admins
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                          {admin.profile_photo_url ? (
                            <img
                              src={admin.profile_photo_url}
                              alt={admin.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            admin.name
                              ?.split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase() || "CA"
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">
                            {admin.name || "Unnamed"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {admin.employee_id || "Employee ID not assigned"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {admin.email}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-600">
                            {admin.company || "No company"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(admin)}
                          className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

function Field({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {hint && (
          <span className="text-[10px] text-slate-400">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <CalendarDays
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass + " pl-10"}
      />
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  show,
  onToggle,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        <span className="ml-1 text-red-500">*</span>
      </label>

      <div className="relative">
        <KeyRound
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          readOnly={readOnly}
          className={
            inputClass +
            " pl-10 pr-11 " +
            (readOnly ? "bg-white" : "")
          }
          placeholder="Enter password"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          title={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}
