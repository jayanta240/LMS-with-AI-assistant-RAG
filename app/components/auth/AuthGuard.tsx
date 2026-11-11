"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function getRoleHome(role: string | null): string | null {
  if (role === "employee") return "/learning";

  if (
    role === "super_admin" ||
    role === "company_admin" ||
    role === "department_head"
  ) {
    return "/dashboard";
  }

  return null;
}

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkedPath, setCheckedPath] = useState<string | null>(null);

  useEffect(() => {
    // Keep public password-recovery pages accessible without a session.
    if (pathname === "/forgot-password") {
      setCheckedPath(pathname);
      return;
    }

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // The root page currently redirects to /login. If a saved session exists,
    // send the user straight to the correct landing page instead of showing
    // the login form again after reopening the site.
    if (pathname === "/login") {
      const roleHome = token ? getRoleHome(role) : null;

      if (roleHome) {
        router.replace(roleHome);
        return;
      }

      setCheckedPath(pathname);
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    setCheckedPath(pathname);
  }, [pathname, router]);

  // Do not render a route until its authentication check has completed.
  // Comparing the path also prevents a previously checked route from flashing
  // while a new route is being checked.
  if (checkedPath !== pathname) {
    return null;
  }

  return <>{children}</>;
}
