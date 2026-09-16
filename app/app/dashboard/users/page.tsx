"use client";

import { useEffect, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/common/PageHeader";
import { assignCourse } from "@/lib/course-api";
import {
  getUsers,
  getCourses,
} from "@/lib/course-api";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type Course = {
  id: number;
  title: string;
};

export default function UsersPage() {

  const [users, setUsers] =
    useState<User[]>([]);

  const [courses, setCourses] =
    useState<Course[]>([]);

  useEffect(() => {

    loadData();

  }, []);

  async function loadData() {

    const u = await getUsers();
    const c = await getCourses();

    setUsers(u);
    setCourses(c);

  }
  async function handleAssign(
  userId: number,
  courseId: number
  ) {

  if (!courseId) return;

  await assignCourse(
    userId,
    courseId
  );

  alert("Course assigned successfully!");

  }

  return (

    <DashboardLayout>

      <PageHeader
        title="Users"
        description="Manage employees and assign courses."
      />

      <div className="overflow-hidden rounded-2xl border bg-white shadow">

        <table className="w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="p-4 text-left">
                Name
              </th>

              <th className="p-4 text-left">
                Email
              </th>

              <th className="p-4 text-left">
                Role
              </th>

              <th className="p-4 text-left">
                Assign Course
              </th>

            </tr>

          </thead>

          <tbody>

            {users.map((user) => (

              <tr
                key={user.id}
                className="border-t"
              >

                <td className="p-4">
                  {user.name}
                </td>

                <td className="p-4">
                  {user.email}
                </td>

                <td className="p-4 capitalize">
                  {user.role}
                </td>

                <td className="p-4">

                  <select
                     className="rounded-lg border p-2"
                     defaultValue=""
                     onChange={(e) =>
                       handleAssign(
                         user.id,
                         Number(e.target.value)
                       )
                     }
                   >

                     <option value="">
                       Select Course
                     </option>

                     {courses.map((course) => (

                       <option
                         key={course.id}
                         value={course.id}
                       >
                         {course.title}
                       </option>

                     ))}

                   </select>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </DashboardLayout>

  );

}