"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Building2, Mail, Phone, MapPin, Plus, Trash2, Search, Users, CheckCircle2, X, ChevronLeft, ChevronRight, Upload, Download, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import { getCompanies, createCompany, deleteCompany } from "@/lib/course-api";

type Company = {
  id: number;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  status?: string;
  employee_count?: number;
};

type Registration = {
  company_name: string; industry_type: string; company_type: string; gst_number: string; cin_number: string; company_description: string;
  contact_person_name: string; contact_designation: string; contact_email: string; contact_mobile: string;
  admin_name: string; admin_email: string; admin_password: string; admin_mobile: string;
  address_line_1: string; address_line_2: string; city: string; state: string; country: string; pin_code: string;
  plan_name: string; license_type: string; start_date: string; expiry_date: string; trial: boolean;
  max_active_users: string; max_courses: string; storage_limit: string; billing_cycle: string;
};

const initialForm: Registration = {
  company_name: "", industry_type: "", company_type: "", gst_number: "", cin_number: "", company_description: "",
  contact_person_name: "", contact_designation: "", contact_email: "", contact_mobile: "",
  admin_name: "", admin_email: "", admin_password: "", admin_mobile: "",
  address_line_1: "", address_line_2: "", city: "", state: "", country: "", pin_code: "",
  plan_name: "", license_type: "", start_date: "", expiry_date: "", trial: false,
  max_active_users: "", max_courses: "", storage_limit: "", billing_cycle: "",
};

const steps = ["Company Information", "Primary Contact", "Company Admin", "Address", "Subscription Plan"];
const requiredByStep: Record<number, (keyof Registration)[]> = {
  0: ["company_name", "industry_type"],
  1: ["contact_person_name", "contact_designation", "contact_email", "contact_mobile"],
  2: ["admin_name", "admin_email", "admin_password"],
  3: ["address_line_1", "city", "state", "country", "pin_code"],
  4: ["plan_name", "license_type", "start_date", "expiry_date", "max_active_users"],
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Registration>(initialForm);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkResult, setBulkResult] = useState<any>(null);

  useEffect(() => { void loadCompanies(); }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      const data = await getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load companies:", error);
      setCompanies([]);
    } finally { setLoading(false); }
  }

  function update<K extends keyof Registration>(key: K, value: Registration[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateStep(index: number) {
    for (const key of requiredByStep[index]) {
      const value = form[key];
      if (typeof value !== "string" || !value.trim()) {
        alert(`${String(key).replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())} is required.`);
        return false;
      }
    }
    if (index === 0 && form.gst_number.trim() && !/^\\d{2}[A-Z]{5}\\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(form.gst_number.trim())) {
      alert("GST Number must be a valid 15-character GSTIN."); return false;
    }
    if (index === 0 && form.cin_number.trim() && !/^[LU]\\d{5}[A-Z]{2}\\d{4}[A-Z]{3}\\d{6}$/i.test(form.cin_number.trim())) {
      alert("CIN Number must be a valid 21-character CIN."); return false;
    }
    if (index === 1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) {
      alert("Enter a valid primary contact email."); return false;
    }
    if (index === 2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_email.trim())) {
      alert("Enter a valid Company Admin email."); return false;
    }
    if (index === 2 && form.admin_password.length < 8) {
      alert("Company Admin password must be at least 8 characters."); return false;
    }
    if (index === 4) {
      if (form.expiry_date < form.start_date) { alert("Expiry Date cannot be before Start Date."); return false; }
      if (!Number.isInteger(Number(form.max_active_users)) || Number(form.max_active_users) < 1) {
        alert("Max Active Users must be a whole number greater than zero."); return false;
      }
      if (form.max_courses && (!Number.isInteger(Number(form.max_courses)) || Number(form.max_courses) < 0)) {
        alert("Max Courses must be a non-negative whole number."); return false;
      }
    }
    return true;
  }

  function closeForm() {
    setShowCreateForm(false); setStep(0); setForm(initialForm);
  }

  async function handleCreate() {
    if (!validateStep(4)) return;
    try {
      setSaving(true);
      await createCompany({
        ...form,
        company_name: form.company_name.trim(),
        contact_person_name: form.contact_person_name.trim(),
        contact_email: form.contact_email.trim(),
        admin_name: form.admin_name.trim(),
        admin_email: form.admin_email.trim(),
        max_active_users: Number(form.max_active_users),
        max_courses: form.max_courses ? Number(form.max_courses) : null,
        storage_limit: form.storage_limit.trim() || null,
        billing_cycle: form.billing_cycle || null,
      });
      alert("Company and initial Company Admin created successfully.");
      closeForm();
      await loadCompanies();
    } catch (error: any) {
      console.error("Company registration error:", error);
      alert(error?.message || "Failed to register company.");
    } finally { setSaving(false); }
  }

  async function uploadCompanies() {
    if (!bulkFile) { setBulkError('Choose an Excel .xlsx file first.'); return; }
    setBulkBusy(true); setBulkError(''); setBulkResult(null);
    try {
      const body = new FormData(); body.append('file', bulkFile);
      const token = localStorage.getItem('token'); const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      const response = await fetch(base + '/api/bulk-registration/companies', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || 'Company bulk upload failed.');
      setBulkResult(data); setBulkFile(null); await loadCompanies();
    } catch (error) { setBulkError(error instanceof Error ? error.message : 'Company bulk upload failed.'); }
    finally { setBulkBusy(false); }
  }
  async function downloadCompanyTemplate() {
    try {
      const token = localStorage.getItem('token'); const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      const response = await fetch(base + '/api/bulk-registration/template?role=company', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
      if (!response.ok) throw new Error('Could not download template.');
      const url = URL.createObjectURL(await response.blob()); const a = document.createElement('a'); a.href = url; a.download = 'company_bulk_upload_template.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (error) { setBulkError(error instanceof Error ? error.message : 'Could not download template.'); }
  }
  async function handleDelete(id: number, companyName: string) {
    if (!window.confirm(`Delete "${companyName}"?\n\nThis action cannot be undone.`)) return;
    try { await deleteCompany(id); await loadCompanies(); }
    catch (error: any) { console.error("Company deletion error:", error); alert(error?.message || "Failed to delete company."); }
  }

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((company) =>
      [company.company_name, company.company_email, company.company_phone, company.company_address]
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [companies, search]);

  const activeCompanies = companies.filter((company) => !company.status || company.status.toLowerCase() === "active").length;
  const inactiveCompanies = companies.length - activeCompanies;

  const inputClass = "mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100";
  const labelClass = "block text-sm font-medium text-slate-700";
  const field = (key: keyof Registration, label: string, required = false, type = "text", placeholder = "") => (
    <label key={key} className={labelClass}>
      {label}{required && <span className="ml-1 text-red-500">*</span>}
      <input type={type} required={required} value={String(form[key] ?? "")} onChange={(e) => update(key, e.target.value as never)} placeholder={placeholder} className={inputClass} />
    </label>
  );
  const textarea = (key: keyof Registration, label: string) => (
    <label key={key} className={labelClass}>{label}
      <textarea value={String(form[key] ?? "")} onChange={(e) => update(key, e.target.value as never)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:bg-white" />
    </label>
  );
  const selectField = (key: keyof Registration, label: string, options: string[], required = false) => (
    <label key={key} className={labelClass}>{label}{required && <span className="ml-1 text-red-500">*</span>}
      <select required={required} value={String(form[key] ?? "")} onChange={(e) => update(key, e.target.value as never)} className={inputClass}>
        <option value="">Select {label}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-600">Organization Management</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Companies</h1>
            <p className="mt-1 text-sm text-slate-500">Create and manage the organizations using your learning platform.</p>
          </div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowBulkUpload((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"><Upload size={18}/> Bulk Upload</button><button type="button" onClick={() => { setForm(initialForm); setStep(0); setShowCreateForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"><Plus size={18}/> Add Company</button></div>
        </div>

        {showBulkUpload && <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Bulk Upload Companies</h2><p className="mt-1 text-sm text-slate-500">Upload company and initial Company Admin details using Excel.</p></div><button type="button" onClick={() => setShowBulkUpload(false)}><X size={18}/></button></div>
          <button type="button" onClick={downloadCompanyTemplate} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"><Download size={16}/> Download .xlsx template</button>
          <label htmlFor="bulk-company-file" className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-sm"><FileSpreadsheet size={24}/><span className="mt-2">{bulkFile?.name || "Choose an Excel .xlsx file"}</span><input id="bulk-company-file" type="file" accept=".xlsx" className="sr-only" onChange={(e) => {setBulkFile(e.target.files?.[0] || null);setBulkResult(null);setBulkError("");}}/></label>
          <button type="button" disabled={bulkBusy || !bulkFile} onClick={uploadCompanies} className="mt-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{bulkBusy ? "Registering companies..." : "Register Companies"}</button>
          {bulkError && <p role="alert" className="mt-3 text-sm text-red-700">{bulkError}</p>}
          {bulkResult && <div className="mt-4 rounded-xl border p-4"><p className="text-sm font-semibold text-emerald-700">Created: {bulkResult.created_count} · Failed: {bulkResult.failed_count}</p>{bulkResult.failed?.map((item: any, index: number) => <p key={item.row + "-" + index} className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">Excel row {item.row}: {item.reason}</p>)}</div>}
        </section>}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total Companies", count: companies.length, icon: <Building2 size={21} />, style: "bg-amber-50 text-amber-600" },
            { label: "Active Companies", count: activeCompanies, icon: <CheckCircle2 size={21} />, style: "bg-emerald-50 text-emerald-600" },
            { label: "Inactive Companies", count: inactiveCompanies, icon: <Building2 size={21} />, style: "bg-slate-100 text-slate-500" },
          ].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{item.count}</p></div><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.style}`}>{item.icon}</div></div>
          </div>)}
        </div>

        {showCreateForm && <section className="rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div><h2 className="text-base font-semibold text-slate-900">Company Registration</h2><p className="mt-1 text-xs text-slate-500">Step {step + 1} of 5 · Fields marked * are mandatory.</p></div>
            <button type="button" onClick={closeForm} aria-label="Close registration form" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
          </div>
          <div className="px-6 pt-5">
            <div className="grid grid-cols-5 gap-2">{steps.map((title, index) => <div key={title} className={`h-1.5 rounded-full ${index <= step ? "bg-amber-500" : "bg-slate-100"}`} />)}</div>
            <div className="mt-3 flex flex-wrap gap-2">{steps.map((title, index) => <span key={title} className={`rounded-full px-3 py-1 text-xs font-medium ${index === step ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{index + 1}. {title}</span>)}</div>
          </div>
          <div className="p-6">
            <div className="grid gap-5 md:grid-cols-2">
              {step === 0 && <>
                {field("company_name", "Company Name", true, "text", "e.g. Wipro")}
                {field("industry_type", "Industry Type", true, "text", "e.g. Information Technology")}
                {field("company_type", "Company Type")}
                {field("gst_number", "GST Number", false, "text", "15-character GSTIN")}
                {field("cin_number", "CIN Number", false, "text", "21-character CIN")}
                <div className="md:col-span-2">{textarea("company_description", "Company Description")}</div>
              </>}
              {step === 1 && <>
                {field("contact_person_name", "Contact Person Name", true)}
                {field("contact_designation", "Designation", true)}
                {field("contact_email", "Email", true, "email")}
                {field("contact_mobile", "Mobile Number", true, "tel")}
              </>}
              {step === 2 && <>
                {field("admin_name", "Admin Name", true)}
                {field("admin_email", "Admin Email", true, "email")}
                {field("admin_password", "Password", true, "password", "At least 8 characters")}
                {field("admin_mobile", "Mobile Number")}
                <p className="md:col-span-2 text-xs text-slate-500">These credentials are for the first Company Admin. The admin can create additional Company Admins after signing in.</p>
              </>}
              {step === 3 && <>
                {field("address_line_1", "Address Line 1", true)}
                {field("address_line_2", "Address Line 2")}
                {field("city", "City", true)}
                {selectField("state", "State", ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"], true)}
                {field("country", "Country", true)}
                {field("pin_code", "PIN Code", true)}
              </>}
              {step === 4 && <>
                {selectField("plan_name", "Plan Name", ["Basic", "Standard", "Premium", "Enterprise"], true)}
                {selectField("license_type", "License Type", ["Named User", "Concurrent User", "Enterprise", "Perpetual", "Subscription"], true)}
                {field("start_date", "Start Date", true, "date")}
                {field("expiry_date", "Expiry Date", true, "date")}
                {field("max_active_users", "Max Active Users", true, "number")}
                {field("max_courses", "Max Courses", false, "number")}
                {field("storage_limit", "Storage Limit")}
                {selectField("billing_cycle", "Billing Cycle", ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "One-Time"])}
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.trial} onChange={(e) => update("trial", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" /> Trial</label>
              </>}
            </div>
            <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
              <button type="button" onClick={() => step === 0 ? closeForm() : setStep((current) => current - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><ChevronLeft size={16} />{step === 0 ? "Cancel" : "Back"}</button>
              {step < 4 ? <button type="button" onClick={() => { if (validateStep(step)) setStep((current) => current + 1); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Next <ChevronRight size={16} /></button>
                : <button type="button" disabled={saving} onClick={handleCreate} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={17} />{saving ? "Creating..." : "Create Company"}</button>}
            </div>
          </div>
        </section>}

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-amber-400 focus:bg-white" /></div>
          <p className="text-sm text-slate-500">Showing <span className="font-semibold text-slate-700">{filteredCompanies.length}</span> of <span className="font-semibold text-slate-700">{companies.length}</span> companies</p>
        </div>

        {loading ? <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" /><p className="mt-4 text-sm text-slate-500">Loading companies...</p></div>
          : filteredCompanies.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Building2 size={34} className="mx-auto text-slate-300" /><h3 className="mt-4 text-base font-semibold text-slate-800">No companies found</h3><p className="mt-1 text-sm text-slate-500">{search ? "Try a different search." : "Create your first company using Add Company."}</p></div>
          : <div className="grid gap-4 xl:grid-cols-2">{filteredCompanies.map((company) => <article key={company.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Building2 size={21} /></div><div className="min-w-0"><h3 className="truncate font-semibold text-slate-900">{company.company_name}</h3><p className="mt-1 text-xs text-slate-500">Company ID: {company.id}</p></div></div><button type="button" onClick={() => handleDelete(company.id, company.company_name)} aria-label={`Delete ${company.company_name}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button></div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2"><p className="flex min-w-0 items-center gap-2"><Mail size={15} className="shrink-0 text-slate-400" /><span className="truncate">{company.company_email || "No contact email"}</span></p><p className="flex items-center gap-2"><Phone size={15} className="shrink-0 text-slate-400" />{company.company_phone || "No phone"}</p><p className="flex items-start gap-2 sm:col-span-2"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" /><span>{company.company_address || "No address"}</span></p></div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Users size={14} />{company.employee_count ?? 0} employees</span><span className={`rounded-full px-2.5 py-1 font-medium ${!company.status || company.status.toLowerCase() === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{company.status || "Active"}</span></div>
          </article>)}</div>}
      </div>
    </DashboardLayout>
  );
}
