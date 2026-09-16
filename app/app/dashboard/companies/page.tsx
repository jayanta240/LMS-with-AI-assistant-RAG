"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Search,
  Users,
  CheckCircle2,
  X,
} from "lucide-react";

import {
  getCompanies,
  createCompany,
  deleteCompany,
} from "@/lib/course-api";


type Company = {
  id: number;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  status?: string;
};


export default function CompaniesPage() {

  const [companies, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [address, setAddress] = useState("");


  // ==========================================================
  // LOAD COMPANIES
  // ==========================================================

  useEffect(() => {

    loadCompanies();

  }, []);


  async function loadCompanies() {

    try {

      setLoading(true);

      const data = await getCompanies();

      setCompanies(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load companies:",
        error
      );

      setCompanies([]);

    } finally {

      setLoading(false);

    }

  }


  // ==========================================================
  // CREATE COMPANY
  // ==========================================================

  async function handleCreate() {

    if (!name.trim()) {

      alert("Company name is required.");

      return;

    }

    try {

      setSaving(true);

      const response =
        await createCompany({

          company_name:
            name.trim(),

          company_email:
            email.trim(),

          company_phone:
            phone.trim(),

          company_address:
            address.trim(),

        });


      if (response?.success === false) {

        alert(
          response?.message ||
          "Unable to create company."
        );

        return;

      }


      setName("");

      setEmail("");

      setPhone("");

      setAddress("");

      setShowCreateForm(false);

      await loadCompanies();

    } catch (error: any) {

      console.error(
        "Company creation error:",
        error
      );

      alert(
        error?.message ||
        "Failed to create company."
      );

    } finally {

      setSaving(false);

    }

  }


  // ==========================================================
  // DELETE COMPANY
  // ==========================================================

  async function handleDelete(
    id: number,
    companyName: string
  ) {

    const confirmed = window.confirm(
      `Delete "${companyName}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }


    try {

      await deleteCompany(id);

      await loadCompanies();

    } catch (error: any) {

      console.error(
        "Company deletion error:",
        error
      );

      alert(
        error?.message ||
        "Failed to delete company."
      );

    }

  }


  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredCompanies =
    useMemo(() => {

      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return companies;
      }

      return companies.filter(
        (company) =>
          company.company_name
            ?.toLowerCase()
            .includes(query) ||
          company.company_email
            ?.toLowerCase()
            .includes(query) ||
          company.company_phone
            ?.toLowerCase()
            .includes(query) ||
          company.company_address
            ?.toLowerCase()
            .includes(query)
      );

    }, [companies, search]);


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const totalCompanies =
    companies.length;

  const activeCompanies =
    companies.filter(
      (company) =>
        !company.status ||
        company.status.toLowerCase() ===
          "active"
    ).length;

  const inactiveCompanies =
    companies.filter(
      (company) =>
        company.status &&
        company.status.toLowerCase() !==
          "active"
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
              Organization Management
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Companies
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create and manage the organizations using your
              learning platform.
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

            <Plus size={18} />

            Add Company

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
                  Total Companies
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {totalCompanies}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

                <Building2 size={21} />

              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Active Companies
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {activeCompanies}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">

                <CheckCircle2 size={21} />

              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Inactive Companies
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {inactiveCompanies}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">

                <Building2 size={21} />

              </div>

            </div>

          </div>

        </div>


        {/* ==================================================
            CREATE COMPANY PANEL
           ================================================== */}

        {showCreateForm && (

          <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

              <div>

                <h2 className="text-base font-semibold text-slate-900">
                  Add New Company
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Enter the organization's basic information.
                </p>

              </div>


              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setName("");
                  setEmail("");
                  setPhone("");
                  setAddress("");
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >

                <X size={18} />

              </button>

            </div>


            <div className="p-6">

              <div className="grid gap-5 md:grid-cols-2">

                {/* Company Name */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Company Name
                  </label>

                  <div className="relative">

                    <Building2
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      placeholder="e.g. Wipro"
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


                {/* Company Email */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Company Email
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
                      placeholder="admin@company.com"
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


                {/* Phone */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone
                  </label>

                  <div className="relative">

                    <Phone
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value)
                      }
                      placeholder="+91 9876543210"
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


                {/* Address */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Address
                  </label>

                  <div className="relative">

                    <MapPin
                      size={17}
                      className="absolute left-3 top-3 text-slate-400"
                    />

                    <textarea
                      value={address}
                      onChange={(e) =>
                        setAddress(e.target.value)
                      }
                      placeholder="Company address"
                      rows={3}
                      className="
                        w-full
                        resize-none
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        pl-10
                        pr-4
                        pt-3
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

              </div>


              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setShowCreateForm(false)
                  }
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
                    : "Create Company"}

                </button>

              </div>

            </div>

          </div>

        )}


        {/* ==================================================
            SEARCH / TOOLBAR
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
              placeholder="Search companies..."
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
                focus:border-amber-400
                focus:bg-white
              "
            />

          </div>


          <p className="text-sm text-slate-500">

            Showing{" "}

            <span className="font-semibold text-slate-700">
              {filteredCompanies.length}
            </span>

            {" "}of{" "}

            <span className="font-semibold text-slate-700">
              {companies.length}
            </span>

            {" "}companies

          </p>

        </div>


        {/* ==================================================
            COMPANY LIST
           ================================================== */}

        <div>

          {loading ? (

            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />

              <p className="mt-4 text-sm text-slate-500">
                Loading companies...
              </p>

            </div>

          ) : filteredCompanies.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">

              <Building2
                size={34}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 text-base font-semibold text-slate-800">
                No companies found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {search
                  ? "Try a different search."
                  : "Create your first company to get started."}
              </p>

            </div>

          ) : (

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

              {filteredCompanies.map(
                (company) => {

                  const active =
                    !company.status ||
                    company.status.toLowerCase() ===
                      "active";


                  return (

                    <div
                      key={company.id}
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

                            <Building2
                              size={22}
                            />

                          </div>

                          <div className="min-w-0">

                            <h2 className="truncate text-base font-bold text-slate-900">
                              {company.company_name}
                            </h2>

                            <p className="mt-0.5 text-xs text-slate-400">
                              Company ID #{company.id}
                            </p>

                          </div>

                        </div>


                        <span
                          className={`
                            inline-flex
                            shrink-0
                            items-center
                            gap-1.5
                            rounded-full
                            px-2.5
                            py-1
                            text-[11px]
                            font-semibold
                            ${
                              active
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500"
                            }
                          `}
                        >

                          <span
                            className={`
                              h-1.5
                              w-1.5
                              rounded-full
                              ${
                                active
                                  ? "bg-emerald-500"
                                  : "bg-slate-400"
                              }
                            `}
                          />

                          {active
                            ? "Active"
                            : company.status}

                        </span>

                      </div>


                      {/* Company Details */}

                      <div className="mt-5 space-y-3">

                        <div className="flex items-start gap-3">

                          <Mail
                            size={16}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />

                          <p className="truncate text-sm text-slate-600">
                            {company.company_email ||
                              "No email provided"}
                          </p>

                        </div>


                        <div className="flex items-start gap-3">

                          <Phone
                            size={16}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />

                          <p className="text-sm text-slate-600">
                            {company.company_phone ||
                              "No phone provided"}
                          </p>

                        </div>


                        <div className="flex items-start gap-3">

                          <MapPin
                            size={16}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />

                          <p className="line-clamp-2 text-sm text-slate-600">
                            {company.company_address ||
                              "No address provided"}
                          </p>

                        </div>

                      </div>


                      {/* Footer */}

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

                        <div className="flex items-center gap-2 text-xs text-slate-400">

                          <Users size={14} />

                          Organization

                        </div>


                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              company.id,
                              company.company_name
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

                          <Trash2 size={14} />

                          Delete

                        </button>

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </div>

      </div>

    </DashboardLayout>

  );
}