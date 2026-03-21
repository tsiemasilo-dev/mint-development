import React, { useState, useEffect } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { supabase } from "../lib/supabase";

const SuccessModal = ({ isOpen, onClose, reference }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Deposit Recorded</h2>
          <p className="text-zinc-400">
            We've recorded your deposit intent. Once your funds reflect in our
            account, your wallet balance will be updated automatically.
          </p>
          <div className="bg-white/5 rounded-xl p-4 mt-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
              Payment Reference
            </p>
            <p className="text-lg font-mono font-medium text-white">{reference}</p>
          </div>
        </div>
        <p className="text-sm text-zinc-500">
          Processing usually takes 1-2 business days depending on your bank.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-zinc-200 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};

const DepositPage = ({ onBack }) => {
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(null);
  const [reference, setReference] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    initDeposit();
  }, []);

  const initDeposit = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;
      if (authUser) {
        setUser(authUser);
        const timestamp = Date.now();
        const newRef = `DEP-${authUser.id.slice(0, 5).toUpperCase()}-${timestamp}`;
        setReference(newRef);
      }
    } catch (err) {
      console.error("Error initializing deposit:", err);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirmDeposit = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert("Please enter a valid deposit amount");
      return;
    }

    try {
      // Record the pending transaction
      const { error } = await supabase.from("transactions").insert([
        {
          user_id: user.id,
          type: "deposit",
          status: "pending",
          direction: "credit",
          amount: Math.round(parseFloat(amount) * 100), // Cents
          store_reference: reference,
          description: "Bank Deposit (EFT)",
          currency: "ZAR",
        },
      ]);

      if (error) throw error;

      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error("Error recording deposit:", err);
      alert("Failed to record deposit. Please try again.");
    }
  };

  const bankDetails = [
    { label: "Account Name", value: "Mint Wealth (Pty) Ltd" },
    { label: "Bank", value: "Standard Bank" },
    { label: "Account Number", value: "10192837465" },
    { label: "Branch Code", value: "051001" },
    { label: "Account Type", value: "Business Current" },
    { label: "SWIFT Code", value: "SBZA ZAJJ" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Deposit Funds</h1>
          <div className="w-10" />
        </div>

        {/* Deposit Amount Input */}
        <div className="space-y-4">
          <label className="text-sm text-zinc-400 font-medium">
            How much would you like to deposit?
          </label>
          <div className="relative">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-medium text-zinc-500">
              R
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-900 border-none rounded-2xl py-6 pl-12 pr-6 text-3xl font-bold focus:ring-2 focus:ring-white/20 placeholder:text-zinc-700 outline-none"
            />
          </div>
          <p className="text-sm text-zinc-500">
            Funds will reflect in your wallet balance once confirmed.
          </p>
        </div>

        {/* Bank Details Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-200">
              Bank Details
            </h2>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5 text-left">
            {/* Reference Number - CRITICAL */}
            <div className="p-6 bg-white/5">
              <div className="flex items-center justify-between mb-2 text-left">
                <span className="text-sm text-zinc-400">Payment Reference</span>
                <span className="text-[10px] bg-green-500/10 text-green-500 font-bold px-2 py-0.5 rounded uppercase">
                  Required
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xl font-mono text-white tracking-wider">
                  {reference || "Generating..."}
                </p>
                <button
                  onClick={() => handleCopy(reference, "ref")}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {copied === "ref" ? "Copied" : "Copy"}
                  </span>
                </button>
              </div>
              <p className="text-xs text-amber-500/80 mt-2 text-left">
                * Please use this exact reference to avoid processing delays.
              </p>
            </div>

            {/* Other details */}
            {bankDetails.map((detail) => (
              <div
                key={detail.label}
                className="p-6 flex items-center justify-between text-left"
              >
                <div className="text-left">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    {detail.label}
                  </p>
                  <p className="text-base font-medium text-zinc-200">
                    {detail.value}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(detail.value, detail.label)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  {copied === detail.label ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
          <button
            onClick={handleConfirmDeposit}
            disabled={!amount || isNaN(amount) || parseFloat(amount) <= 0}
            className="w-full bg-white text-black font-bold py-5 rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:hover:bg-white flex items-center justify-center gap-2"
          >
            I have made my deposit
          </button>
        </div>
      </div>

      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={onBack}
        reference={reference}
      />
    </div>
  );
};

export default DepositPage;
