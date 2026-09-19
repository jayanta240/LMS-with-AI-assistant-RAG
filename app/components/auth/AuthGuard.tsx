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
    // The login page must remain publicly accessible.
    if (pathname === "/login") {
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
  if (checking || pathname !== "/login" && !localStorage.getItem("token")) {
    return null;
  }

  return <>{children}</>;
}
