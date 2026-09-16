"use client";

import { Search } from "lucide-react";

type Props = {
  placeholder?: string;
};

export default function SearchBar({
  placeholder = "Search...",
}: Props) {
  return (
    <div className="relative w-full max-w-md">

      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        size={18}
      />

      <input
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 shadow-sm outline-none focus:border-blue-500"
      />

    </div>
  );
}