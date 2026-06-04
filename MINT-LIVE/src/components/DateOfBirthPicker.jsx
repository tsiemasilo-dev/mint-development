import React, { useState, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DateOfBirthPicker = ({ value, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i - 10);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setSelectedDay(date.getDate().toString());
        setSelectedMonth((date.getMonth() + 1).toString());
        setSelectedYear(date.getFullYear().toString());
      }
    }
  }, [value]);

  const handleConfirm = () => {
    if (selectedDay && selectedMonth && selectedYear) {
      const day = selectedDay.padStart(2, "0");
      const month = selectedMonth.padStart(2, "0");
      const dateString = `${selectedYear}-${month}-${day}`;
      onChange(dateString);
    }
    setShowPicker(false);
  };

  const formatDisplayDate = () => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300"
      >
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-slate-400" />
          <span className={`text-base font-medium ${value ? "text-slate-900" : "text-slate-400"}`}>
            {formatDisplayDate() || "Select date of birth"}
          </span>
        </div>
        <ChevronDown className="h-5 w-5 text-slate-400" />
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-white pb-8 pt-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between px-6">
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="text-base font-medium text-slate-500"
              >
                Cancel
              </button>
              <h3 className="text-lg font-semibold text-slate-900">Date of Birth</h3>
              <button
                type="button"
                onClick={handleConfirm}
                className="text-base font-semibold text-blue-600"
              >
                Done
              </button>
            </div>

            <div className="flex gap-2 px-6">
              <div className="flex-1">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Day
                </label>
                <div className="relative">
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">--</option>
                    {days.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="flex-[1.5]">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Month
                </label>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">--</option>
                    {months.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="flex-1">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Year
                </label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">--</option>
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default DateOfBirthPicker;
