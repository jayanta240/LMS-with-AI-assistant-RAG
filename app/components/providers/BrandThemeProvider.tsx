"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePathname } from "next/navigation";


type Branding = {
  company_id: number;
  company_name: string;
  logo_url: string;
  logo_public_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
};


type BrandingContextType = {
  branding: Branding;
  refreshBranding: () => Promise<void>;
};


const DEFAULT_BRANDING: Branding = {
  company_id: 0,
  company_name: "Learning Platform",
  logo_url: "",
  logo_public_id: "",
  primary_color: "#FBBF24",
  secondary_color: "#0F172A",
  accent_color: "#F59E0B",
};


const BrandingContext =
  createContext<BrandingContextType | undefined>(
    undefined
  );


// ============================================================
// COLOR HELPERS
// ============================================================

function normalizeColor(
  value: string | undefined,
  fallback: string
) {
  if (
    !value ||
    !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
  ) {
    return fallback;
  }

  return value;
}


function getContrastColor(
  hex: string
) {
  const clean =
    hex.replace("#", "");


  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((x) => x + x)
          .join("")
      : clean;


  const r = parseInt(
    full.substring(0, 2),
    16
  );

  const g = parseInt(
    full.substring(2, 4),
    16
  );

  const b = parseInt(
    full.substring(4, 6),
    16
  );


  const luminance =
    (0.299 * r +
      0.587 * g +
      0.114 * b) /
    255;


  return luminance > 0.62
    ? "#0F172A"
    : "#FFFFFF";
}


// ============================================================
// COMPANY-SPECIFIC CACHE
// ============================================================

function getCacheKey(
  companyId: number
) {
  return `company_branding_${companyId}`;
}


function getCachedBranding(
  companyId: number
): Branding | null {

  if (!companyId) {
    return null;
  }


  try {

    const raw =
      localStorage.getItem(
        getCacheKey(companyId)
      );


    if (!raw) {
      return null;
    }


    const parsed =
      JSON.parse(raw);


    // Never use another company's cache.

    if (
      Number(parsed.company_id) !==
      companyId
    ) {
      return null;
    }


    return {

      company_id:
        companyId,

      company_name:
        parsed.company_name || "",

      logo_url:
        parsed.logo_url || "",

      logo_public_id:
        parsed.logo_public_id || "",

      primary_color:
        normalizeColor(
          parsed.primary_color,
          DEFAULT_BRANDING.primary_color
        ),

      secondary_color:
        normalizeColor(
          parsed.secondary_color,
          DEFAULT_BRANDING.secondary_color
        ),

      accent_color:
        normalizeColor(
          parsed.accent_color,
          DEFAULT_BRANDING.accent_color
        ),
    };

  } catch (error) {

    console.error(
      "Failed to read cached branding:",
      error
    );

    return null;
  }
}


// ============================================================
// CACHE BRANDING
// ============================================================

function cacheBranding(
  branding: Branding
) {

  if (!branding.company_id) {
    return;
  }


  try {

    localStorage.setItem(
      getCacheKey(
        branding.company_id
      ),
      JSON.stringify(
        branding
      )
    );

  } catch (error) {

    console.error(
      "Failed to cache branding:",
      error
    );
  }
}


// ============================================================
// APPLY CSS VARIABLES
// ============================================================

function applyBranding(
  branding: Branding
) {

  const root =
    document.documentElement;


  const primary =
    branding.primary_color;

  const secondary =
    branding.secondary_color;

  const accent =
    branding.accent_color;


  root.style.setProperty(
    "--brand-primary",
    primary
  );


  root.style.setProperty(
    "--brand-secondary",
    secondary
  );


  root.style.setProperty(
    "--brand-accent",
    accent
  );


  root.style.setProperty(
    "--brand-primary-text",
    getContrastColor(primary)
  );


  root.style.setProperty(
    "--brand-secondary-text",
    getContrastColor(secondary)
  );


  root.style.setProperty(
    "--brand-accent-text",
    getContrastColor(accent)
  );
}


// ============================================================
// PROVIDER
// ============================================================

export default function BrandThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const pathname =
    usePathname();


  const [branding, setBranding] =
    useState<Branding | null>(
      null
    );


  const [brandingLoading, setBrandingLoading] =
    useState(true);


  const fetchingRef =
    useRef(false);


  const brandingRef =
    useRef<Branding | null>(null);


  // Keep ref synchronized with state.

  useEffect(() => {

    brandingRef.current =
      branding;

  }, [branding]);


  // ==========================================================
  // RESET TO DEFAULT
  // ==========================================================

  const resetBranding =
    useCallback(() => {

      brandingRef.current =
        null;


      setBranding(null);


      applyBranding(
        DEFAULT_BRANDING
      );


      setBrandingLoading(
        false
      );

    }, []);


  // ==========================================================
  // REFRESH BRANDING
  // ==========================================================

  const refreshBranding =
    useCallback(async () => {

      /*
       * IMPORTANT:
       *
       * The login page is platform-level.
       * It must NEVER call the company branding API.
       */

      if (
        pathname === "/login"
      ) {

        resetBranding();

        return;
      }


      if (
        fetchingRef.current
      ) {
        return;
      }


      const token =
        localStorage.getItem(
          "token"
        );


      const currentCompanyId =
        Number(
          localStorage.getItem(
            "company_id"
          )
        );


      // ========================================================
      // NO AUTHENTICATED COMPANY
      // ========================================================

      if (
        !token ||
        !currentCompanyId
      ) {

        resetBranding();

        return;
      }


      try {

        fetchingRef.current =
          true;


        const currentBranding =
          brandingRef.current;


        // ======================================================
        // COMPANY CHANGED
        // ======================================================

        if (
          currentBranding &&
          currentBranding.company_id !==
            currentCompanyId
        ) {

          brandingRef.current =
            null;


          setBranding(null);


          applyBranding(
            DEFAULT_BRANDING
          );

        }


        // ======================================================
        // COMPANY-SPECIFIC CACHE
        // ======================================================

        const cached =
          getCachedBranding(
            currentCompanyId
          );


        if (cached) {

          brandingRef.current =
            cached;


          setBranding(
            cached
          );


          applyBranding(
            cached
          );

        }


        // ======================================================
        // FETCH FROM BACKEND
        // ======================================================

        const response =
          await fetch(
            "/api/company/branding",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache: "no-store",
            }
          );


        // ======================================================
        // API ERROR
        // ======================================================

        if (!response.ok) {

          /*
           * Don't spam the console for expected
           * unauthenticated requests.
           */

          if (
            response.status !== 401
          ) {

            console.error(
              "Branding request failed:",
              response.status
            );

          }


          /*
           * Keep valid company-specific cache.
           */

          if (!cached) {

            resetBranding();

          }


          return;
        }


        // ======================================================
        // PARSE RESPONSE
        // ======================================================

        const data =
          await response.json();


        const serverBranding =
          data?.branding;


        if (!serverBranding) {

          if (!cached) {
            resetBranding();
          }

          return;
        }


        // ======================================================
        // SECURITY CHECK
        // ======================================================

        const returnedCompanyId =
          Number(
            serverBranding.company_id
          );


        if (
          returnedCompanyId !==
          currentCompanyId
        ) {

          console.error(
            "Branding company mismatch.",
            {
              expected:
                currentCompanyId,

              received:
                returnedCompanyId,
            }
          );


          /*
           * Never display branding from
           * another company.
           */

          if (cached) {

            brandingRef.current =
              cached;


            setBranding(
              cached
            );


            applyBranding(
              cached
            );

          } else {

            resetBranding();

          }


          return;
        }


        // ======================================================
        // BUILD CLEAN BRANDING
        // ======================================================

        const updatedBranding: Branding = {

          company_id:
            currentCompanyId,

          company_name:
            serverBranding.company_name ||
            "",

          logo_url:
            serverBranding.logo_url ||
            "",

          logo_public_id:
            serverBranding.logo_public_id ||
            "",

          primary_color:
            normalizeColor(
              serverBranding.primary_color,
              DEFAULT_BRANDING.primary_color
            ),

          secondary_color:
            normalizeColor(
              serverBranding.secondary_color,
              DEFAULT_BRANDING.secondary_color
            ),

          accent_color:
            normalizeColor(
              serverBranding.accent_color,
              DEFAULT_BRANDING.accent_color
            ),
        };


        // ======================================================
        // APPLY LATEST BRANDING
        // ======================================================

        brandingRef.current =
          updatedBranding;


        setBranding(
          updatedBranding
        );


        applyBranding(
          updatedBranding
        );


        cacheBranding(
          updatedBranding
        );


      } catch (error) {

        console.error(
          "Failed to refresh company branding:",
          error
        );

      } finally {

        fetchingRef.current =
          false;


        setBrandingLoading(
          false
        );

      }

    }, [
      pathname,
      resetBranding,
    ]);


  // ==========================================================
  // INITIAL LOAD / ROUTE CHANGE
  // ==========================================================

  useEffect(() => {

    /*
     * When moving from:
     *
     * /login → /dashboard
     *
     * refresh the branding automatically.
     */

    refreshBranding();

  }, [
    pathname,
    refreshBranding,
  ]);


  // ==========================================================
  // COMPANY CHANGE EVENT
  // ==========================================================

  useEffect(() => {

    const handleCompanyChange =
      () => {

        /*
         * If we're on login, keep the generic
         * platform theme and don't call the API.
         */

        if (
          pathname === "/login"
        ) {

          resetBranding();

          return;
        }


        /*
         * Clear old company immediately.
         */

        brandingRef.current =
          null;


        setBranding(
          null
        );


        applyBranding(
          DEFAULT_BRANDING
        );


        setBrandingLoading(
          true
        );


        /*
         * Fetch the new company's branding.
         */

        refreshBranding();

      };


    window.addEventListener(
      "company-changed",
      handleCompanyChange
    );


    return () => {

      window.removeEventListener(
        "company-changed",
        handleCompanyChange
      );

    };

  }, [
    pathname,
    refreshBranding,
    resetBranding,
  ]);


  // ==========================================================
  // REFRESH EVERY 30 SECONDS
  // ==========================================================

  useEffect(() => {

    /*
     * Don't poll the backend on login.
     */

    if (
      pathname === "/login"
    ) {

      return;
    }


    const interval =
      window.setInterval(
        () => {

          refreshBranding();

        },
        30_000
      );


    return () => {

      window.clearInterval(
        interval
      );

    };

  }, [
    pathname,
    refreshBranding,
  ]);


  // ==========================================================
  // REFRESH WHEN TAB BECOMES VISIBLE
  // ==========================================================

  useEffect(() => {

    if (
      pathname === "/login"
    ) {

      return;
    }


    const handleVisibility =
      () => {

        if (
          document.visibilityState ===
          "visible"
        ) {

          refreshBranding();

        }

      };


    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );


    return () => {

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

    };

  }, [
    pathname,
    refreshBranding,
  ]);


  // ==========================================================
  // REFRESH WHEN BRANDING CACHE CHANGES
  // ==========================================================

  useEffect(() => {

    if (
      pathname === "/login"
    ) {

      return;
    }


    const handleStorage =
      (event: StorageEvent) => {

        if (
          event.key?.startsWith(
            "company_branding_"
          )
        ) {

          refreshBranding();

        }

      };


    window.addEventListener(
      "storage",
      handleStorage
    );


    return () => {

      window.removeEventListener(
        "storage",
        handleStorage
      );

    };

  }, [
    pathname,
    refreshBranding,
  ]);


  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const value =
    useMemo(
      () => ({
        branding:
          branding ||
          DEFAULT_BRANDING,

        refreshBranding,
      }),
      [
        branding,
        refreshBranding,
      ]
    );


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    pathname !== "/login" &&
    brandingLoading &&
    !branding
  ) {

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="text-center">

          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200"
            style={{
              borderTopColor:
                DEFAULT_BRANDING.primary_color,
            }}
          />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading workspace...
          </p>

        </div>

      </div>
    );

  }


  // ==========================================================
  // PROVIDER
  // ==========================================================

  return (
    <BrandingContext.Provider
      value={value}
    >
      {children}
    </BrandingContext.Provider>
  );
}


// ============================================================
// HOOK
// ============================================================

export function useBranding() {

  const context =
    useContext(
      BrandingContext
    );


  if (!context) {

    throw new Error(
      "useBranding must be used inside BrandThemeProvider"
    );

  }


  return context;
}