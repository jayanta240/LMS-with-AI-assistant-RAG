"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

import {
    getCompanies,
    getCompanyAdmins,
    deleteCompanyAdmin,
    registerUser
} from "@/lib/course-api";

export default function CompanyAdminsPage(){

    const [companies,setCompanies]=useState<any[]>([]);
    const [admins,setAdmins]=useState<any[]>([]);
    const [loadingAdmins,setLoadingAdmins]=useState(true);

    const [name,setName]=useState("");
    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");

    const [company,setCompany]=useState("");

    useEffect(()=>{

        loadData();

    },[]);

    async function loadData(){

        try {

            setLoadingAdmins(true);

            const [companiesData, adminsData] = await Promise.all([
                getCompanies(),
                getCompanyAdmins(),
            ]);

            setCompanies(
                Array.isArray(companiesData)
                    ? companiesData
                    : []
            );

            setAdmins(
                Array.isArray(adminsData)
                    ? adminsData
                    : []
            );

        } catch (error) {

            console.error(
                "Failed to load Company Admins page:",
                error
            );

            setCompanies([]);
            setAdmins([]);

        } finally {

            setLoadingAdmins(false);

        }

    }

    async function handleDelete(admin: any){

        const confirmed = window.confirm(
            `Delete "${admin.name}" (${admin.email}) permanently?\\n\\nThis will remove the Company Admin account from the database and cannot be undone.`
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


    async function handleCreate(){

        if (!name.trim()) {
            alert("Name is required.");
            return;
        }

        if (!email.trim()) {
            alert("Email is required.");
            return;
        }

        if (!password.trim()) {
            alert("Password is required.");
            return;
        }

        if (!company) {
            alert("Please select a company.");
            return;
        }

        try {

            const result = await registerUser({

                name: name.trim(),

                email: email.trim(),

                password,

                role:"company_admin",

                company_id:Number(company)

            });

            if (result?.success === false) {
                alert(
                    result?.message ||
                    "Unable to create Company Admin."
                );
                return;
            }

            alert("Company Admin Created");

            setName("");
            setEmail("");
            setPassword("");
            setCompany("");

        } catch (error: any) {

            alert(
                error?.message ||
                "Failed to create Company Admin."
            );

        }

    }

    return(

    <DashboardLayout>

        <div className="p-8">

            <h1 className="text-3xl font-bold">

                Company Admins

            </h1>

            <div className="mt-8 rounded-xl bg-white p-8 shadow">

                <input
                className="w-full rounded border p-3 mb-4"
                placeholder="Name"
                value={name}
                onChange={(e)=>setName(e.target.value)}
                />

                <input
                className="w-full rounded border p-3 mb-4"
                placeholder="Email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                />

                <input
                type="password"
                className="w-full rounded border p-3 mb-4"
                placeholder="Password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                />

                <select
                className="w-full rounded border p-3 mb-5"
                value={company}
                onChange={(e)=>setCompany(e.target.value)}
                >

                    <option value="">

                        Select Company

                    </option>

                    {companies.map((c:any)=>(

                        <option
                        key={c.id}
                        value={c.id}
                        >

                            {c.company_name}

                        </option>

                    ))}

                </select>

                <button
                onClick={handleCreate}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white"
                >

                    Create Company Admin

                </button>

            </div>

            <div className="mt-10 rounded-xl bg-white p-8 shadow">

                <div className="flex flex-col gap-2 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            Company Admins
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Full list of all Company Admin accounts and their assigned companies.
                        </p>
                    </div>

                    <p className="text-sm font-medium text-slate-500">
                        Total:{" "}
                        <span className="text-slate-900">
                            {admins.length}
                        </span>
                    </p>

                </div>

                {loadingAdmins ? (

                    <div className="py-12 text-center text-sm text-slate-500">
                        Loading Company Admins...
                    </div>

                ) : admins.length === 0 ? (

                    <div className="py-12 text-center">

                        <p className="font-medium text-slate-700">
                            No Company Admins found.
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Create the first Company Admin using the form above.
                        </p>

                    </div>

                ) : (

                    <div className="mt-6 overflow-x-auto">

                        <table className="min-w-full text-left">

                            <thead>
                                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">

                                    <th className="px-4 py-3">
                                        Name
                                    </th>

                                    <th className="px-4 py-3">
                                        Gmail / Email
                                    </th>

                                    <th className="px-4 py-3">
                                        Company
                                    </th>

                                    <th className="px-4 py-3">
                                        Company ID
                                    </th>

                                    <th className="px-4 py-3 text-right">
                                        Action
                                    </th>

                                </tr>
                            </thead>

                            <tbody>

                                {admins.map((admin) => (

                                    <tr
                                        key={admin.id}
                                        className="border-b border-slate-100 last:border-0"
                                    >

                                        <td className="px-4 py-4">

                                            <p className="font-semibold text-slate-900">
                                                {admin.name || "Unnamed"}
                                            </p>

                                        </td>

                                        <td className="px-4 py-4">

                                            <p className="text-sm text-slate-600">
                                                {admin.email || "No email"}
                                            </p>

                                        </td>

                                        <td className="px-4 py-4">

                                            <p className="font-medium text-slate-800">
                                                {admin.company || "No company"}
                                            </p>

                                        </td>

                                        <td className="px-4 py-4">

                                            <span className="text-sm text-slate-500">
                                                {admin.company_id ?? "-"}
                                            </span>

                                        </td>

                                        <td className="px-4 py-4 text-right">

                                            <button
                                                type="button"
                                                onClick={() => handleDelete(admin)}
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

        </div>

    </DashboardLayout>

    );

}