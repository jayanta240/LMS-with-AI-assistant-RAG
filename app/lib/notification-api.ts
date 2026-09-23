const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8000");

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

export type NotificationSettings = {
  course_assignment_email: boolean;
  certificate_email: boolean;
};

export async function getNotificationSettings() {

  const res =
    await fetch(
      `${BASE}/api/company/notification-settings`,
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
      "Failed to load notification settings"
    );
  }

  return data as {
    success: boolean;
    settings: NotificationSettings;
    email_delivery_configured?: boolean;
  };
}

export async function updateNotificationSettings(
  settings: NotificationSettings
) {

  const res =
    await fetch(
      `${BASE}/api/company/notification-settings`,
      {
        method: "PUT",
        headers:
          authHeaders(),
        body: JSON.stringify(
          settings
        ),
      }
    );

  const data =
    await res.json();

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to update notification settings"
    );
  }

  return data as {
    success: boolean;
    settings: NotificationSettings;
  };
}
