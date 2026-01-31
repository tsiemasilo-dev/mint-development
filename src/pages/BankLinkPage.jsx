import React, { useState } from "react";
import { ArrowLeft, Landmark, Shield } from "lucide-react";
import { supabase } from "../lib/supabase";

const BankLinkPage = ({ onBack, onComplete }) => {
  const [formData, setFormData] = useState({
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    branchCode: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      if (!supabase) {
        setErrorMessage("Bank linking is unavailable right now.");
        setIsSaving(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setErrorMessage("Please sign in to link a bank account.");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("linked_bank_accounts")
        .insert({
          user_id: userData.user.id,
          bank_name: formData.bankName,
          account_number: formData.accountNumber,
          branch_code: formData.branchCode || null,
          account_holder: formData.accountHolder || null,
          is_default_payout: true,
        });

      if (error) {
        console.error("Failed to save bank details", error);
        setErrorMessage("Unable to save bank details. Please try again.");
        setIsSaving(false);
        return;
      }

      onComplete?.();
    } catch (err) {
      console.error("Failed to save bank details", err);
      setErrorMessage("Unable to save bank details. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Link Bank Account</h1>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-6">
            <Landmark className="h-10 w-10" />
          </div>

          <h2 className="text-xl font-semibold text-slate-900 mb-2">Bank details</h2>
          <p className="text-sm text-slate-500 mb-8">
            Provide your bank account details for withdrawals and payouts.
          </p>

          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            <div className="text-left">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Account holder name
              </label>
              <input
                type="text"
                required
                value={formData.accountHolder}
                onChange={handleChange("accountHolder")}
                placeholder="Full name"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-violet-400"
              />
            </div>

            <div className="text-left">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Bank name
              </label>
              <input
                type="text"
                required
                value={formData.bankName}
                onChange={handleChange("bankName")}
                placeholder="e.g. FNB"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-violet-400"
              />
            </div>

            <div className="text-left">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Account number
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={formData.accountNumber}
                onChange={handleChange("accountNumber")}
                placeholder="Bank account number"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-violet-400"
              />
            </div>

            <div className="text-left">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Branch code
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={formData.branchCode}
                onChange={handleChange("branchCode")}
                placeholder="Branch code"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none focus:border-violet-400"
              />
            </div>

            {errorMessage ? (
              <p className="text-sm text-rose-500">{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? "Saving..." : "Save bank details"}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <Shield className="h-4 w-4" />
            <span>
              These details are used for payouts and withdrawals when you withdraw.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankLinkPage;
