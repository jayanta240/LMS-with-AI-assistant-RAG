import { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
}: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <h2 className="mt-3 text-4xl font-bold text-gray-900">
            {value}
          </h2>

          <div className="mt-4 flex items-center gap-2">

            <ArrowUpRight
              className="text-green-500"
              size={16}
            />

            <span className="text-sm text-green-600">
              {subtitle}
            </span>

          </div>

        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">

          {icon}

        </div>

      </div>

    </div>
  );
}