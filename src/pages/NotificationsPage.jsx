import React from "react";
import { ArrowLeft, Settings, Bell, Mailbox } from "lucide-react";

const notifications = [
  {
    id: "vista-1",
    title: "Vista rewards club...",
    body: "Earn Points without making a purchase. Complete your first mission today!",
    date: "Dec 16, 2023",
    unread: true,
  },
  {
    id: "vista-2",
    title: "The Vista rewards cl...",
    body: "Keep paying with Vista to boost your points and unlock rewards. It's as simple as that.",
    date: "Dec 12, 2023",
    unread: false,
  },
  {
    id: "vista-3",
    title: "The Vista rewards cl...",
    body: "Now you're a member of Vista rewards club, start picking up points with every purchase.",
    date: "Dec 8, 2023",
    unread: false,
  },
];

const NotificationsPage = ({ onBack }) => {
  const hasNotifications = notifications.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-10 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Notifications</h1>
          <button
            type="button"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <Settings className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm">
          <Bell className="h-4 w-4" />
          Customize your notifications!
        </div>

        {hasNotifications ? (
          <div className="mt-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Previously
            </p>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex gap-3 rounded-3xl bg-white p-4 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-200 text-base font-semibold text-rose-900">
                  V.
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">{notification.title}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{notification.date}</span>
                      {notification.unread && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{notification.body}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-500">
              <Mailbox className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-lg font-semibold">No notifications yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your notification will appear here once you&apos;ve received them.
            </p>
          </div>
        )}

        <div className="mt-10 text-center text-sm text-slate-500">
          Missing notifications?{" "}
          <button type="button" className="font-semibold text-slate-700 underline">
            Go to historical notifications.
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
