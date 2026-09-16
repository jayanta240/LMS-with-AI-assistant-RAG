"use client";

import { useEffect, useState } from "react";
import EmployeeLayout from "@/components/layout/EmployeeLayout";

export default function ProfilePage() {
  const [user, setUser] = useState({
    name: "",
    email: "",
    role: "",
  });

  useEffect(() => {
    setUser({
      name: localStorage.getItem("user_name") || "Employee",
      email: localStorage.getItem("email") || "employee@example.com",
      role: localStorage.getItem("role") || "Employee",
    });
  }, []);

  return (
    <EmployeeLayout>
      <div className="p-8">
        <h1 className="text-4xl font-bold text-gray-900">
          My Profile
        </h1>

        <p className="mt-2 text-gray-500">
          View your account information.
        </p>

        <div className="mt-8 rounded-2xl bg-white p-8 shadow">
          <div className="flex items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-4xl text-white">
              👤
            </div>

            <div>
              <h2 className="text-3xl font-bold">
                {user.name}
              </h2>

              <p className="mt-1 text-gray-500">
                {user.email}
              </p>

              <span className="mt-3 inline-block rounded-full bg-blue-100 px-4 py-1 text-blue-700">
                {user.role}
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">
                Name
              </h3>

              <p className="mt-2 text-gray-600">
                {user.name}
              </p>
            </div>

            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">
                Email
              </h3>

              <p className="mt-2 text-gray-600">
                {user.email}
              </p>
            </div>

            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">
                Role
              </h3>

              <p className="mt-2 text-gray-600">
                {user.role}
              </p>
            </div>

            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">
                Assigned Courses
              </h3>

              <p className="mt-2 text-gray-600">
                Coming Soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
}