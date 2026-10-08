export type GlobalSearchResult = {
  type: string;
  id: number;
  title: string;
  subtitle?: string;
  href: string;
};

const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8000");

export async function searchGlobal(
  query: string
): Promise<GlobalSearchResult[]> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const res = await fetch(
    `${BASE}/api/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      "Search failed"
    );
  }

  return Array.isArray(data?.results)
    ? data.results
    : [];
}
