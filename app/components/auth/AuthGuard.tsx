"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Authentication and password recovery pages must be publicly accessible.
    // Users who forgot their password will not have a valid session token.
    const publicRoutes = ["/login", "/forgot-password"];
    if (publicRoutes.includes(pathname)) {
      setChecking(false);
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setChecking(false);
  }, [pathname, router]);

  // Do not mount protected pages until authentication has been checked.
  // This also prevents protected pages from firing their API calls first.
  const publicRoutes = ["/login", "/forgot-password"];
  if (checking || (!publicRoutes.includes(pathname) && !localStorage.getItem("token"))) {
    return null;
  }

  return <>{children}</>;
}
