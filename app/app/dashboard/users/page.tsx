"use client";

import { useEffect, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/common/PageHeader";
import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";
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

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    loadData();

  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([getUsers(), getCourses()]);
      setUsers(Array.isArray(u) ? u : []);
      setCourses(Array.isArray(c) ? c : []);
    } catch (error) {
      console.error("Failed to load users and courses:", error);
      setUsers([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
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

      {loading ? (
        <PageLoadingSkeleton title="Loading users and course assignments" variant="table" rows={6} />
      ) : (
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
      )}

    </DashboardLayout>

  );

}