"use client";

import {
  Bell,
  CalendarDays,
  SlidersHorizontal,
  Menu,
  CheckCheck,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useBranding } from "@/components/providers/BrandThemeProvider";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/notification-api";
export default function Header({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const { branding } = useBranding();
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<AppNotification[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [notificationsLoading, setNotificationsLoading] =
    useState(false);

  const [role, setRole] =
    useState("User");

  const [userName, setUserName] =
    useState("User");

  const [companyName, setCompanyName] =
    useState("");


  async function loadNotifications() {
    try {
      setNotificationsLoading(true);

      const data = await getNotifications();

      setNotifications(
        Array.isArray(data.notifications)
          ? data.notifications
          : []
      );

      setUnreadCount(
        Number(data.unread_count || 0)
      );
    } catch (error) {
      console.error(
        "Failed to load notifications:",
        error
      );
    } finally {
      setNotificationsLoading(false);
    }
  }


  useEffect(() => {
    loadNotifications();

    const interval =
      window.setInterval(
        loadNotifications,
        30000
      );

    return () =>
      window.clearInterval(interval);
  }, []);


  async function handleNotificationClick(
    notification: AppNotification
  ) {
    try {
      if (!notification.is_read) {
        await markNotificationRead(
          notification.id
        );

        setNotifications(
          (current) =>
            current.map((item) =>
              item.id === notification.id
                ? { ...item, is_read: true }
                : item
            )
        );

        setUnreadCount(
          (current) =>
            Math.max(0, current - 1)
        );
      }
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );
    }

    setNotificationsOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  }


  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();

      setNotifications(
        (current) =>
          current.map((item) => ({
            ...item,
            is_read: true,
          }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error
      );
    }
  }


  function formatNotificationTime(
    value: string
  ) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }


  useEffect(() => {
    const storedRole =
      localStorage.getItem("role") || "";

    const storedName =
      localStorage.getItem("user_name") ||
      localStorage.getItem("name") ||
      "User";

    const storedCompany =
      localStorage.getItem("company_name") ||
      "";

    setUserName(storedName);
    setCompanyName(storedCompany);

    switch (storedRole) {
      case "super_admin":
        setRole("Super Admin");
        break;

      case "company_admin":
        setRole("Company Admin");
        break;

      case "department_head":
        setRole("Department Head");
        break;

      case "employee":
        setRole("Employee");
        break;

      default:
        setRole("User");
    }
  }, []);


  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();


  return (
    <header className="flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-3 sm:h-[82px] sm:px-6 lg:px-8">

      {/* =====================================================
          LEFT
         ===================================================== */}

      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-50 md:hidden"
        >
          <Menu size={22} />
        </button>
</div>


      {/* =====================================================
          RIGHT
         ===================================================== */}

      <div className="ml-2 flex shrink-0 items-center gap-1 sm:gap-4">

        {/* Calendar */}

        <button
          type="button"
          className="
            hidden
            rounded-xl
            p-2.5
            text-slate-500
            transition
            hover:bg-slate-50
            hover:text-slate-900
          "
          title="Calendar"
        >
          <CalendarDays size={20} />
        </button>


        {/* Notifications */}

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen(
                (current) => !current
              )
            }
            className="
              relative
              rounded-xl
              p-2.5
              text-slate-500
              transition
              hover:bg-slate-50
              hover:text-slate-900
            "
            title="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell size={21} />

            {unreadCount > 0 && (
              <span
                className="
                  absolute
                  -right-0.5
                  -top-0.5
                  flex
                  h-5
                  min-w-5
                  items-center
                  justify-center
                  rounded-full
                  px-1
                  text-[10px]
                  font-bold
                "
                style={{
                  backgroundColor:
                    "var(--brand-accent)",
                  color:
                    "var(--brand-secondary)",
                }}
              >
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="
                absolute
                right-0
                top-full
                z-50
                mt-3
                w-[min(360px,calc(100vw-24px))]
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-xl
              "
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Notifications
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {unreadCount > 0
                      ? unreadCount + " unread"
                      : "All caught up"}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition hover:bg-slate-50"
                    style={{
                      color:
                        "var(--brand-primary)",
                    }}
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {notificationsLoading ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-500">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell
                      size={24}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      No notifications
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      New system activity will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map(
                    (notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() =>
                          handleNotificationClick(
                            notification
                          )
                        }
                        className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                      >
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              notification.is_read
                                ? "#CBD5E1"
                                : "var(--brand-accent)",
                          }}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-800">
                              {notification.title}
                            </span>

                            {!notification.is_read && (
                              <span
                                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    "var(--brand-accent)",
                                }}
                              />
                            )}
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {notification.message}
                          </span>

                          <span className="mt-1.5 block text-[10px] text-slate-400">
                            {formatNotificationTime(
                              notification.created_at
                            )}
                          </span>
                        </span>
                      </button>
                    )
                  )
                )}
              </div>
            </div>
          )}
        </div>


        {/* Filters */}

        <button
          type="button"
          className="
            hidden
            items-center
            gap-2
            rounded-xl
            border
            border-slate-200
            px-4
            py-2.5
            text-sm
            font-medium
            text-slate-600
            transition
            hover:bg-slate-50
            lg:flex
          "
        >

          <SlidersHorizontal size={16} />

          Filters

        </button>


        {/* User */}

        <div className="ml-1 flex items-center gap-2 sm:ml-2 sm:gap-3">

          {/* Avatar */}

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              text-sm
              font-bold
            "
            style={{
              backgroundColor:
                "var(--brand-primary)",
              color:
                "var(--brand-primary-text)",
              borderColor:
                "var(--brand-accent)",
            }}
          >
            {initials || "U"}
          </div>


          {/* User information */}

          <div className="hidden leading-tight lg:block">

            <p className="text-sm font-semibold text-slate-900">
              {userName}
            </p>

            <p className="text-[12px] text-slate-500">
              {role}
              {companyName
                ? ` • ${companyName}`
                : ""}
            </p>

          </div>


          {/* Account menu */}

          <button
            type="button"
            className="ml-1 hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 sm:block"
            title="Account menu"
          >
            <span className="text-xs">
              ⌄
            </span>
          </button>

        </div>

      </div>

    </header>
  );
}