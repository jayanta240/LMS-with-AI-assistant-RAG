"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

import {
    getCompanies,
    registerUser
} from "@/lib/course-api";

export default function CompanyAdminsPage(){

    const [companies,setCompanies]=useState([]);

    const [name,setName]=useState("");
    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");

    const [company,setCompany]=useState("");

    useEffect(()=>{

        loadCompanies();

    },[]);

    async function loadCompanies(){

        const data=await getCompanies();

        setCompanies(data);

    }

    async function handleCreate(){

        await registerUser({

            name,

            email,

            password,

            role:"company_admin",

            company_id:Number(company)

        });

        alert("Company Admin Created");

        setName("");
        setEmail("");
        setPassword("");

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

                    <option>

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

        </div>

    </DashboardLayout>

    );

}