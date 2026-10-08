"use client";

import {
  Building2,
  BookOpen,
  Briefcase,
  FileText,
  Search,
  UserRound,
  GraduationCap,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  searchGlobal,
  GlobalSearchResult,
} from "@/lib/search-api";

function iconForType(type: string) {
  switch (type) {
    case "company":
      return Building2;
    case "course":
      return GraduationCap;
    case "department":
      return Briefcase;
    case "file":
      return FileText;
    case "lesson":
      return BookOpen;
    case "user":
      return UserRound;
    default:
      return Search;
  }
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] =
    useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }

      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () =>
      window.removeEventListener(
        "keydown",
        handleShortcut
      );
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        const nextResults = await searchGlobal(query.trim());
        setResults(nextResults);
        setActiveIndex(0);
        setOpen(true);
      } catch (error) {
        console.error("Global search failed:", error);
        setResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const navigateTo = (result: GlobalSearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!open || results.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index + 1) % results.length
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) =>
          (index - 1 + results.length) % results.length
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();
      navigateTo(results[activeIndex]);
    }
  };

  return (
    <div className="relative min-w-0 flex-1 sm:w-[360px] sm:flex-none">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search anything..."
        aria-label="Search"
        autoComplete="off"
        className="
          h-11 w-full rounded-xl border border-slate-200
          bg-white pl-11 pr-16 text-sm text-slate-800
          outline-none transition placeholder:text-slate-400
          focus:ring-2
        "
        style={{
          borderColor: open
            ? "var(--brand-primary)"
            : undefined,
        }}
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        ) : (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
            Ctrl + K
          </span>
        )}
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close search"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {loading ? (
              <div className="px-4 py-4 text-sm text-slate-500">
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-500">
                No results found.
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto py-2">
                {results.map((result, index) => {
                  const Icon = iconForType(result.type);

                  return (
                    <button
                      key={`${result.type}-${result.id}-${index}`}
                      type="button"
                      onClick={() => navigateTo(result)}
                      className={
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition " +
                        (index === activeIndex
                          ? "bg-slate-50"
                          : "hover:bg-slate-50")
                      }
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Icon size={17} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {result.title}
                        </span>

                        {result.subtitle && (
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {result.subtitle}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
