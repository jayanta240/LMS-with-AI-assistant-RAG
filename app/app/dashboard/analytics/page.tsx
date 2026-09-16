"use client";

import { useEffect, useState } from "react";
import DashboardLayout  from "@/components/layout/DashboardLayout";
import { getAnalytics } from "@/lib/course-api";

export default function AnalyticsPage() {

  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {

    try {

      const data = await getAnalytics();

      setAnalytics(
        Array.isArray(data) ? data : []
      );

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  }

  return (

    <DashboardLayout>

      <div className="min-h-screen bg-gray-100 p-8">

        <h1 className="text-4xl font-bold">
          📊 Learning Analytics
        </h1>

        <p className="mt-2 text-gray-500">
          Track employee progress across all assigned courses.
        </p>

        <div className="mt-8 rounded-2xl bg-white shadow overflow-hidden">

          {loading ? (

            <div className="p-8">
              Loading...
            </div>

          ) : analytics.length === 0 ? (

            <div className="p-8 text-center text-gray-500">
              No analytics available.
            </div>

          ) : (

            <table className="w-full">

              <thead className="bg-gray-100">

                <tr>

                  <th className="p-4 text-left">
                    Employee
                  </th>

                  <th className="p-4 text-left">
                    Course
                  </th>

                  <th className="p-4">
                    Progress
                  </th>

                  <th className="p-4">
                    Lessons
                  </th>

                  <th className="p-4">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                {analytics.map((row, index) => (

                  <tr
                    key={index}
                    className="border-t"
                  >

                    <td className="p-4">
                      {row.employee}
                    </td>

                    <td className="p-4">
                      {row.course}
                    </td>

                    <td className="p-4">

                      <div className="flex items-center gap-3">

                        <div className="h-3 w-40 rounded-full bg-gray-200">

                          <div
                            className="h-3 rounded-full bg-blue-600"
                            style={{
                              width: `${row.progress}%`,
                            }}
                          />

                        </div>

                        <span>
                          {row.progress}%
                        </span>

                      </div>

                    </td>

                    <td className="p-4 text-center">

                      {row.completed} / {row.total}

                    </td>

                    <td className="p-4 text-center">

                      {row.progress === 100 ? (

                        <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                          Completed
                        </span>

                      ) : row.progress > 0 ? (

                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">
                          In Progress
                        </span>

                      ) : (

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                          Not Started
                        </span>

                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </div>

    </DashboardLayout>

  );

}