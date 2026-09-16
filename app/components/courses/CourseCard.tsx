"use client";

import Link from "next/link";
import {
  BookOpen,
  Calendar,
  ArrowRight,
  Pencil,
  Trash2,
} from "lucide-react";

type Props = {
  id: number;
  title: string;
  description: string;
  created_at: string;
  onDelete: (id: number) => void;
};

export default function CourseCard({
  id,
  title,
  description,
  created_at,
  onDelete,
}: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">

      <div className="flex items-start justify-between">

        <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center">

          <BookOpen
            className="text-blue-600"
            size={28}
          />

        </div>

        <div className="flex gap-2">

          <button className="rounded-lg p-2 hover:bg-gray-100">
            <Pencil size={18}/>
          </button>

          <button
                 onClick={() => {

                 if (confirm("Delete this course?")) {

                     onDelete(id);

                 }

                 }}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
            >
                 <Trash2 size={18}/>
            </button>

        </div>

      </div>

      <h2 className="mt-5 text-xl font-semibold text-gray-900">
        {title}
      </h2>

      <p className="mt-2 text-gray-500 line-clamp-2">
        {description}
      </p>

      <div className="mt-5 flex items-center gap-2 text-sm text-gray-400">

        <Calendar size={15}/>

        {created_at}

      </div>

      <Link
        href={`/dashboard/courses/${id}`}
        className="mt-6 flex items-center gap-2 text-blue-600 font-medium hover:gap-3 transition-all"
      >
        Manage Lessons

        <ArrowRight size={18}/>
      </Link>

    </div>
  );
}