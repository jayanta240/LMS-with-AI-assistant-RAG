const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8000");


// ============================================================
// CACHE CONFIGURATION
// ============================================================

const CACHE_TTL = 60 * 1000; // 60 seconds


type CacheEntry = {
  data: any;
  expiresAt: number;
};


// In-memory browser cache.
// Because this module stays loaded while navigating within
// the Next.js application, data can be reused between pages.
const apiCache = new Map<string, CacheEntry>();


// Prevent duplicate requests when the same resource is being
// requested simultaneously.
const pendingRequests = new Map<
  string,
  Promise<any>
>();


// ============================================================
// AUTH HELPERS
// ============================================================

function authHeaders(): Record<string, string> {

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  return {
    "Content-Type": "application/json",

    ...(token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {}),
  };
}


// ============================================================
// CACHE IDENTITY
// ============================================================
//
// Important for multi-tenant applications.
//
// A cache entry should not accidentally be reused after a
// different user logs in.
//
// We therefore include user/company identity in cache keys.
// ============================================================

function getCacheIdentity(): string {

  if (
    typeof window ===
    "undefined"
  ) {
    return "server";
  }

  const userId =
    localStorage.getItem(
      "user_id"
    ) || "unknown-user";

  const companyId =
    localStorage.getItem(
      "company_id"
    ) || "no-company";

  const role =
    localStorage.getItem(
      "role"
    ) || "unknown-role";

  return [
    userId,
    companyId,
    role,
  ].join(":");
}


// ============================================================
// CACHE KEY
// ============================================================

function makeCacheKey(
  key: string
): string {

  return `${getCacheIdentity()}:${key}`;
}


// ============================================================
// INVALIDATE CACHE
// ============================================================

function invalidateCache(
  keyPrefix?: string
) {

  if (!keyPrefix) {
    apiCache.clear();
    return;
  }

  const identity =
    getCacheIdentity();

  const prefix =
    `${identity}:${keyPrefix}`;

  for (
    const key of apiCache.keys()
  ) {

    if (
      key === prefix ||
      key.startsWith(
        `${prefix}:`
      )
    ) {
      apiCache.delete(key);
    }
  }
}


// ============================================================
// INVALIDATE ALL USER CACHE
// ============================================================

export function clearApiCache() {
  apiCache.clear();
}


// ============================================================
// CACHED GET
// ============================================================

async function cachedGet<T>(
  key: string,
  url: string,
  ttl: number = CACHE_TTL
): Promise<T> {

  const cacheKey =
    makeCacheKey(key);

  const now =
    Date.now();

  const cached =
    apiCache.get(
      cacheKey
    );


  // ----------------------------------------------------------
  // CACHE HIT
  // ----------------------------------------------------------

  if (
    cached &&
    cached.expiresAt > now
  ) {

    return cached.data as T;
  }


  // ----------------------------------------------------------
  // STALE CACHE
  // ----------------------------------------------------------
  //
  // Return old data immediately and refresh in background.
  // This prevents the page from showing a 2–3 second spinner
  // every time the user navigates back.
  // ----------------------------------------------------------

  if (cached) {

    if (
      !pendingRequests.has(
        cacheKey
      )
    ) {

      const refreshPromise =
        fetchFresh<T>(
          url
        )
          .then(
            (data) => {

              apiCache.set(
                cacheKey,
                {
                  data,
                  expiresAt:
                    Date.now() +
                    ttl,
                }
              );

              return data;
            }
          )
          .catch(
            (error) => {

              console.error(
                `Background refresh failed for ${key}:`,
                error
              );

              return cached.data;
            }
          )
          .finally(
            () => {
              pendingRequests.delete(
                cacheKey
              );
            }
          );

      pendingRequests.set(
        cacheKey,
        refreshPromise
      );
    }


    return cached.data as T;
  }


  // ----------------------------------------------------------
  // NO CACHE
  // ----------------------------------------------------------

  if (
    pendingRequests.has(
      cacheKey
    )
  ) {

    return pendingRequests.get(
      cacheKey
    ) as Promise<T>;
  }


  const request =
    fetchFresh<T>(
      url
    )
      .then(
        (data) => {

          apiCache.set(
            cacheKey,
            {
              data,
              expiresAt:
                Date.now() +
                ttl,
            }
          );

          return data;
        }
      )
      .finally(
        () => {

          pendingRequests.delete(
            cacheKey
          );

        }
      );


  pendingRequests.set(
    cacheKey,
    request
  );


  return request;
}


// ============================================================
// FRESH REQUEST
// ============================================================

async function fetchFresh<T>(
  url: string
): Promise<T> {

  const res =
    await fetch(
      url,
      {
        headers:
          authHeaders(),
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Request failed"
    );
  }


  return data as T;
}


// ============================================================
// COURSES
// ============================================================

export async function getCourses() {

  return cachedGet<any[]>(
    "courses",
    `${BASE}/api/courses`
  );
}


export async function getCourse(
  courseId: number
) {

  return cachedGet<any>(
    `course:${courseId}`,
    `${BASE}/api/courses/${courseId}`
  );
}


export async function createCourse(
  title: string,
  description: string
) {

  const res =
    await fetch(
      `${BASE}/api/courses`,
      {
        method: "POST",
        headers:
          authHeaders(),
        body: JSON.stringify({
          title,
          description,
          thumbnail_url: "",
        }),
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to create course"
    );
  }


  invalidateCache(
    "courses"
  );


  return data;
}


export async function updateCourse(
  id: number,
  title: string,
  description: string
) {

  const res =
    await fetch(
      `${BASE}/api/courses/${id}`,
      {
        method: "PUT",
        headers:
          authHeaders(),
        body: JSON.stringify({
          title,
          description,
          thumbnail_url: "",
        }),
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to update course"
    );
  }


  invalidateCache(
    "courses"
  );

  invalidateCache(
    `course:${id}`
  );

  invalidateCache(
    `course-lessons:${id}`
  );


  return data;
}


export async function deleteCourse(
  id: number
) {

  const res =
    await fetch(
      `${BASE}/api/courses/${id}`,
      {
        method: "DELETE",
        headers:
          authHeaders(),
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to delete course"
    );
  }


  invalidateCache(
    "courses"
  );

  invalidateCache(
    `course:${id}`
  );

  invalidateCache(
    `course-lessons:${id}`
  );


  return data;
}


// ============================================================
// LESSONS
// ============================================================

export async function getCourseLessons(
  courseId: number
) {

  return cachedGet<any[]>(
    `course-lessons:${courseId}`,
    `${BASE}/api/courses/${courseId}/lessons`
  );
}


export async function createLesson(
  data: {
    course_id: number;
    title: string;
    content_type: string;
    content_url: string;
    lesson_order: number;
  }
) {

  const res =
    await fetch(
      `${BASE}/api/lessons`,
      {
        method: "POST",
        headers:
          authHeaders(),
        body: JSON.stringify(
          data
        ),
      }
    );


  const result =
    await res.json();


  if (!res.ok) {

    throw new Error(
      result?.detail ||
      result?.message ||
      "Failed to create lesson"
    );
  }


  invalidateCache(
    `course-lessons:${data.course_id}`
  );

  invalidateCache(
    "courses"
  );


  return result;
}


// ============================================================
// FILES
// ============================================================

export async function getFiles() {

  return cachedGet<any[]>(
    "files",
    `${BASE}/api/files`
  );
}


// ============================================================
// USERS
// ============================================================

export async function getUsers() {

  return cachedGet<any[]>(
    "users",
    `${BASE}/api/users`
  );
}


export async function getCompanyAdmins() {

  return cachedGet<any[]>(
    "company-admins",
    `${BASE}/api/company-admins`
  );
}


// ============================================================
// USER COURSES
// ============================================================

export async function getUserCourses(
  userId: number
) {

  return cachedGet<any[]>(
    `user-courses:${userId}`,
    `${BASE}/api/users/${userId}/courses`
  );
}


// ============================================================
// ENROLLMENTS
// ============================================================

export async function assignCourse(
  userId: number,
  courseId: number
) {

  const res =
    await fetch(
      `${BASE}/api/enrollments`,
      {
        method: "POST",
        headers:
          authHeaders(),
        body: JSON.stringify({
          user_id: userId,
          course_id: courseId,
        }),
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to assign course"
    );
  }


  // Invalidate the affected user's course list.
  invalidateCache(
    `user-courses:${userId}`
  );


  // Progress-related data may also be affected.
  invalidateCache(
    "dashboard-stats"
  );


  return data;
}


// ============================================================
// LESSON PROGRESS
// ============================================================

export async function markLessonComplete(
  userId: number,
  courseId: number,
  lessonId: number
) {

  const res =
    await fetch(
      `${BASE}/api/lesson-progress`,
      {
        method: "POST",
        headers:
          authHeaders(),
        body: JSON.stringify({
          user_id: userId,
          course_id: courseId,
          lesson_id: lessonId,
        }),
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to mark lesson complete"
    );
  }


  invalidateCache(
    `completed-lessons:${userId}`
  );

  invalidateCache(
    `course-progress:${userId}:${courseId}`
  );

  invalidateCache(
    `user-courses:${userId}`
  );

  invalidateCache(
    "dashboard-stats"
  );


  return data;
}


export async function getCompletedLessons(
  userId: number
) {

  return cachedGet<any[]>(
    `completed-lessons:${userId}`,
    `${BASE}/api/users/${userId}/completed-lessons`
  );
}


// ============================================================
// COURSE PROGRESS
// ============================================================

export async function getCourseProgress(
  userId: number,
  courseId: number
) {

  return cachedGet<any>(
    `course-progress:${userId}:${courseId}`,
    `${BASE}/api/users/${userId}/courses/${courseId}/progress`
  );
}


// ============================================================
// DASHBOARD
// ============================================================

export async function getDashboardStats() {

  return cachedGet<any>(
    "dashboard-stats",
    `${BASE}/api/dashboard/stats`
  );
}


// ============================================================
// ANALYTICS
// ============================================================

export async function getAnalytics() {

  return cachedGet<any>(
    "analytics",
    `${BASE}/api/admin/analytics`
  );
}


// ============================================================
// COMPANIES
// ============================================================

export async function getCompanies() {

  return cachedGet<any[]>(
    "companies",
    `${BASE}/api/companies`
  );
}


export async function createCompany(
  data: {
    company_name: string;
    company_email: string;
    company_phone: string;
    company_address: string;
  }
) {

  const res =
    await fetch(
      `${BASE}/api/companies`,
      {
        method: "POST",
        headers:
          authHeaders(),
        body: JSON.stringify(
          data
        ),
      }
    );


  const result =
    await res.json();


  if (!res.ok) {

    throw new Error(
      result?.detail ||
      result?.message ||
      "Failed to create company"
    );
  }


  invalidateCache(
    "companies"
  );


  return result;
}


export async function deleteCompany(
  id: number
) {

  const res =
    await fetch(
      `${BASE}/api/companies/${id}`,
      {
        method: "DELETE",
        headers:
          authHeaders(),
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to delete company"
    );
  }


  invalidateCache(
    "companies"
  );

  invalidateCache(
    "departments"
  );

  invalidateCache(
    "dashboard-stats"
  );


  return data;
}


// ============================================================
// DEPARTMENTS
// ============================================================

export async function getDepartments(
  companyId: number
) {

  return cachedGet<any[]>(
    `departments:${companyId}`,
    `${BASE}/api/companies/${companyId}/departments`
  );
}


export async function createDepartment(
  companyId: number,
  departmentName: string
) {

  const res =
    await fetch(
      `${BASE}/api/departments`,
      {
        method: "POST",
        headers:
          authHeaders(),
        body: JSON.stringify({
          company_id: companyId,
          department_name:
            departmentName,
        }),
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to create department"
    );
  }


  invalidateCache(
    `departments:${companyId}`
  );

  invalidateCache(
    "dashboard-stats"
  );


  return data;
}


export async function deleteDepartment(
  departmentId: number
) {

  const res =
    await fetch(
      `${BASE}/api/departments/${departmentId}`,
      {
        method: "DELETE",
        headers:
          authHeaders(),
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to delete department"
    );
  }


  // We don't have the company ID here,
  // so invalidate the complete department cache.
  invalidateCache(
    "departments"
  );

  invalidateCache(
    "dashboard-stats"
  );


  return data;
}


// ============================================================
// USER REGISTRATION
// ============================================================

export async function registerUser(
  data: any
) {

  const res =
    await fetch(
      `${BASE}/api/auth/register`,
      {
        method: "POST",
        headers:
          authHeaders(),
        body: JSON.stringify(
          data
        ),
      }
    );


  const result =
    await res.json();


  if (!res.ok) {

    throw new Error(
      result?.detail ||
      result?.message ||
      "Failed to register user"
    );
  }


  invalidateCache(
    "users"
  );

  invalidateCache(
    "dashboard-stats"
  );


  return result;
}


// ============================================================
// COMPANY BRANDING
// ============================================================

export async function getCompanyBranding() {

  const token =
    localStorage.getItem(
      "token"
    );


  const res =
    await fetch(
      `${BASE}/api/company/branding`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      "Failed to load company branding"
    );
  }


  return data;
}


export async function updateCompanyBranding(
  branding: {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
  }
) {

  const token =
    localStorage.getItem(
      "token"
    );


  const res =
    await fetch(
      `${BASE}/api/company/branding`,
      {
        method: "PUT",
        headers: {
          Authorization:
            `Bearer ${token}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          branding
        ),
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      "Failed to update company branding"
    );
  }


  return data;
}


export async function uploadCompanyLogo(
  file: File
) {

  const token =
    localStorage.getItem(
      "token"
    );


  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );


  const res =
    await fetch(
      `${BASE}/api/company/branding/logo`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        body: formData,
      }
    );


  const data =
    await res.json();


  if (!res.ok) {

    throw new Error(
      data?.detail ||
      "Failed to upload company logo"
    );
  }


  return data;
}