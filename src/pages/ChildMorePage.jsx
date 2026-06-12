import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Baby,
  ChevronRight,
  LogOut,
  Settings,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { supabase } from "../lib/supabase";

function getAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fmtRands(cents) {
  const val = (Number(cents) || 0) / 100;
  return `R\u202F${val.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function kycState(child) {
  const kyc = String(child?.kyc_status || "pending").toLowerCase();
  const cert = String(child?.certificate_verification_status || "pending_review").toLowerCase();
  const verified = cert === "verified" || kyc === "completed";
  const rejected = kyc === "rejected" || cert === "rejected";
  if (verified) return { label: "Verified", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", pulse: false };
  if (rejected) return { label: "KYC Rejected", cls: "bg-red-50 text-red-700 border-red-200", pulse: false };
  return { label: "KYC Pending", cls: "bg-amber-50 text-amber-700 border-amber-200", pulse: true };
}

const ChildMorePage = ({ child, onCloseAccount, onBackToParent }) => {
  const [parentName, setParentName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data?.user?.user_metadata || {};
      const name = [meta.first_name, meta.last_name].filter(Boolean).join(" ");
      setParentName(name || data?.user?.email?.split("@")[0] || "Parent");
    });
  }, []);

  const childName = [child?.first_name, child?.last_name].filter(Boolean).join(" ") || "Child";
  const age = getAge(child?.date_of_birth);
  const kyc = kycState(child);
  const balance = child?.available_balance || 0;

  const initials = childName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-white px-6 pt-16 pb-24">
      <header className="mb-8 flex items-center">
        <button
          onClick={onBackToParent}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
          aria-label="Back to main account"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)" }}
          >
            {initials || "C"}
          </div>
        </div>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      <div className="flex flex-col items-center text-center mb-8">
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-violet-100 text-violet-700 border border-violet-200">
          <Baby className="h-3 w-3" />
          Child Account
        </span>
        <h2 className="mt-3 text-xl font-semibold text-slate-900">{childName}</h2>
        {age !== null && (
          <p className="mt-1 text-sm text-slate-400">{age} year{age !== 1 ? "s" : ""} old</p>
        )}
        {child?.date_of_birth && (
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(child.date_of_birth).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${kyc.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${kyc.pulse ? "animate-pulse" : ""}`} style={{ backgroundColor: "currentColor" }} />
            {kyc.label}
          </span>
          {balance > 0 && (
            <span className="text-xs font-semibold text-slate-500">
              Balance: {fmtRands(balance)}
            </span>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Managed by <span className="font-semibold text-slate-600">{parentName}</span>
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase text-slate-400 px-1 mb-3">Account Info</p>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm divide-y divide-slate-50">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <User className="h-4 w-4 text-slate-500" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">Full Name</p>
                <p className="text-xs text-slate-400 mt-0.5">{childName}</p>
              </div>
            </div>
            {child?.id_number && (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">ID Number</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {"•".repeat(9)}{child.id_number.slice(-4)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <ShieldCheck className="h-4 w-4 text-slate-500" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">KYC Status</p>
                <p className="text-xs text-slate-400 mt-0.5">{kyc.label}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-slate-400 px-1 mb-3">Managed By Parent</p>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3.5">
            <p className="text-sm text-slate-500 leading-relaxed">
              This account is managed by <span className="font-semibold text-slate-700">{parentName}</span>. All settings such as PIN, notifications, and security are controlled from the parent account.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-slate-400 px-1 mb-3">Account</p>
          <button
            onClick={onBackToParent}
            className="flex w-full items-center gap-3 rounded-2xl bg-white border border-slate-100 px-4 py-3.5 shadow-sm text-left transition active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <LogOut className="h-4 w-4 text-slate-500" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Back to Main Account</p>
              <p className="text-xs text-slate-400 mt-0.5">Return to {parentName}'s account</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
          </button>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-slate-400 px-1 mb-3">Danger Zone</p>
          <button
            onClick={onCloseAccount}
            className="flex w-full items-center gap-3 rounded-2xl bg-white border border-slate-100 px-4 py-3.5 shadow-sm text-left transition active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-4 w-4 text-red-500" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-600">Close This Account</p>
              <p className="text-xs text-slate-400 mt-0.5">Permanently remove {child?.first_name || "this child"}'s account</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChildMorePage;
