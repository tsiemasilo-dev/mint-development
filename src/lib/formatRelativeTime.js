export const formatRelativeTime = (timestamp, { isLoading = false } = {}) => {
  if (isLoading) {
    return "Updating...";
  }

  if (!timestamp) {
    return "";
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSeconds < 60) {
    return `Updated ${rtf.format(diffSeconds, "second")}`;
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return `Updated ${rtf.format(diffMinutes, "minute")}`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `Updated ${rtf.format(diffHours, "hour")}`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `Updated ${rtf.format(diffDays, "day")}`;
};
