import {
  GraduationCap,
  BookOpen,
  Users,
  Trophy,
} from "lucide-react";

const stats = [
  {
    title: "Courses",
    value: "24",
    icon: GraduationCap,
  },
  {
    title: "Lessons",
    value: "340",
    icon: BookOpen,
  },
  {
    title: "Employees",
    value: "128",
    icon: Users,
  },
  {
    title: "Completion",
    value: "95%",
    icon: Trophy,
  },
];

export default function CourseStats() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

      {stats.map((stat) => {

        const Icon = stat.icon;

        return (

          <div
            key={stat.title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-gray-500">
                  {stat.title}
                </p>

                <h2 className="mt-3 text-3xl font-bold">
                  {stat.value}
                </h2>

              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">

                <Icon size={24} />

              </div>

            </div>

          </div>

        );

      })}

    </div>
  );
}