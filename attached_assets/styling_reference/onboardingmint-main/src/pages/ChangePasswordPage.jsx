import React, { useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

const ChangePasswordPage = ({ onNavigate }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToast = (message, type = "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      showToast("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match");
      return;
    }

    if (!supabase) {
      showToast("Unable to connect to the server");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        showToast(error.message);
        setIsLoading(false);
        return;
      }

      showToast("Password updated successfully", "success");
      setTimeout(() => {
        onNavigate?.("settings");
      }, 1500);
    } catch (err) {
      console.error("Failed to update password:", err);
      showToast("Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-6 pb-10 pt-10">
      {toast.show && (
        <div
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 transform rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="relative mb-8 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onNavigate?.("settings")}
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Change Password</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <label className="text-xs uppercase tracking-wide text-slate-400">New Password</label>
          <div className="relative mt-1 flex items-center">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full border-0 bg-transparent p-0 pr-10 text-base font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-0 text-slate-400"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <label className="text-xs uppercase tracking-wide text-slate-400">Confirm New Password</label>
          <div className="relative mt-1 flex items-center">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full border-0 bg-transparent p-0 pr-10 text-base font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-0 text-slate-400"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Password must be at least 8 characters long
        </p>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordPage;
