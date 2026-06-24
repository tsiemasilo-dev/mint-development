import React, { useRef, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNotificationsContext } from "../lib/NotificationsContext";

const NotificationBell = ({ onClick, className = "" }) => {
  const { unreadCount } = useNotificationsContext();
  const prevCount = useRef(unreadCount);
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    if (unreadCount > prevCount.current) {
      setPinging(true);
      const t = setTimeout(() => setPinging(false), 2500);
      prevCount.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  return (
    <button
      aria-label="Notifications"
      type="button"
      onClick={onClick}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md ${className}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {pinging && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          )}
          <span className="relative">{unreadCount > 99 ? "99+" : unreadCount}</span>
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
