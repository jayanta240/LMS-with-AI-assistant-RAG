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


export type AppNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
};

export async function getNotifications() {
  const res = await fetch(
    `${BASE}/api/notifications`,
    {
      headers: authHeaders(),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to load notifications"
    );
  }

  return data as {
    notifications: AppNotification[];
    unread_count: number;
  };
}

export async function markNotificationRead(
  id: number
) {
  const res = await fetch(
    `${BASE}/api/notifications/${id}/read`,
    {
      method: "PATCH",
      headers: authHeaders(),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to update notification"
    );
  }

  return data as {
    success: boolean;
  };
}

export async function markAllNotificationsRead() {
  const res = await fetch(
    `${BASE}/api/notifications/read-all`,
    {
      method: "POST",
      headers: authHeaders(),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      "Failed to mark notifications as read"
    );
  }

  return data as {
    success: boolean;
    updated: number;
  };
}
