import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { Gift, CheckCircle, Eye, EyeOff, Smartphone, Clock, AlertCircle, Loader2, ArrowRight, LogIn } from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE || "";

function fmtCents(cents) {
  return `R ${(Number(cents) / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeLeft(expiresAt) {
  const ms = new Date(expiresAt) - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const MINT_PURPLE = "#7c3aed";

const slideUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

function Spinner() {
  return <Loader2 className="animate-spin" size={22} style={{ color: MINT_PURPLE }} />;
}

function Input({ label, type = "text", value, onChange, placeholder, autoComplete, maxLength }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
      />
    </div>
  );
}

function PwInput({ label, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-[15px] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
        />
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled, loading: isLoading, secondary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
        secondary
          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
          : "text-white shadow-md hover:shadow-lg"
      }`}
      style={secondary ? {} : { background: `linear-gradient(135deg, ${MINT_PURPLE}, #6d28d9)` }}
    >
      {isLoading ? <Loader2 size={18} className="animate-spin" /> : children}
    </button>
  );
}

function GiftCard({ gift }) {
  const remaining = gift?.expires_at ? timeLeft(gift.expires_at) : null;
  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl flex-shrink-0" style={{ background: "linear-gradient(135deg,#c4b5fd,#8b5cf6)" }}>
          🎁
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest mb-0.5">Investment Gift</p>
          <p className="text-xl font-extrabold text-slate-900 leading-tight">{fmtCents(gift.amount)}</p>
          <p className="text-sm text-slate-600 mt-0.5">in <span className="font-semibold text-slate-800">{gift.asset_name}</span></p>
          <p className="text-xs text-slate-500 mt-1">from <span className="font-semibold">{gift.sender_name}</span></p>
        </div>
      </div>
      {gift.message && (
        <div className="mt-4 rounded-xl bg-white/70 border border-violet-100 px-4 py-3">
          <p className="text-sm text-slate-600 italic">"{gift.message}"</p>
        </div>
      )}
      {remaining && (
        <div className="mt-3 flex items-center gap-1.5 text-amber-600">
          <Clock size={12} />
          <span className="text-[11px] font-semibold">Expires in {remaining}</span>
        </div>
      )}
    </div>
  );
}

function ErrorScreen({ title, body, icon: Icon = AlertCircle }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-8">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <Icon size={28} className="text-red-400" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500 mt-1">{body}</p>
      </div>
    </div>
  );
}

export default function GiftLandingPage({ giftId }) {
  const [step, setStep] = useState("loading");
  const [gift, setGift] = useState(null);
  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPw] = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");

  const [claimCode, setClaimCode] = useState("");
  const [idNumber, setId] = useState("");

  const loadGift = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/gift/by-id/${giftId}`);
      const data = await res.json();
      if (!res.ok) return setStep(data.error === "Gift not found." ? "not_found" : "error");
      if (data.status === "claimed" || data.status === "expired" || data.status === "cancelled") {
        setGift(data);
        return setStep(data.status);
      }
      if (new Date(data.expires_at) < new Date()) {
        setGift(data);
        return setStep("expired");
      }
      setGift(data);
      return data;
    } catch {
      setStep("error");
      return null;
    }
  }, [giftId]);

  const checkAuth = useCallback(async () => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  }, []);

  useEffect(() => {
    (async () => {
      const [giftData, currentUser] = await Promise.all([loadGift(), checkAuth()]);
      if (!giftData) return;
      setUser(currentUser);
      setStep(currentUser ? "claim" : "preview");
    })();

    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        setStep("claim");
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
        setStep("preview");
      }
    });
    return () => subscription?.unsubscribe();
  }, [loadGift, checkAuth]);

  const handleLogin = async () => {
    setErr("");
    if (!email.trim() || !password) return setErr("Please enter your email and password.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setErr(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async () => {
    setErr("");
    if (!firstName.trim() || !lastName.trim()) return setErr("Please enter your first and last name.");
    if (!email.trim()) return setErr("Please enter your email address.");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { first_name: firstName.trim(), last_name: lastName.trim() },
          emailRedirectTo: window.location.href,
        },
      });
      if (error) setErr(error.message);
      else setStep("signup_sent");
    } finally {
      setBusy(false);
    }
  };

  const handleClaim = async () => {
    setErr("");
    const code = claimCode.replace(/\D/g, "");
    const id = idNumber.replace(/\D/g, "");
    if (code.length !== 6) return setErr("Enter the 6-digit code your sender shared with you.");
    if (id.length !== 13) return setErr("Enter your full 13-digit SA ID number.");
    if (!supabase) return setErr("App not ready. Please refresh.");
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setStep("preview"); return; }
      const res = await fetch(`${BASE}/api/gift/claim-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, id_number: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.kyc_required) return setStep("needs_kyc");
        return setErr(data.error || "Something went wrong. Please try again.");
      }
      setStep("success");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f1eef6" }}>
      <div
        className="px-5 pb-10 pt-12 text-white text-center"
        style={{ background: "linear-gradient(135deg,#c4b5fd 0%,#a78bfa 30%,#8b5cf6 60%,#7c3aed 100%)" }}
      >
        <div className="text-4xl mb-2">🎁</div>
        <h1 className="text-2xl font-extrabold tracking-tight">mint gifts</h1>
        <p className="text-sm font-medium text-violet-100 mt-0.5">investing, differently</p>
      </div>

      <div className="flex-1 px-4 py-6 max-w-md w-full mx-auto">
        <AnimatePresence mode="wait">
          {step === "loading" && (
            <motion.div key="loading" {...slideUp} className="flex justify-center py-16">
              <Spinner />
            </motion.div>
          )}

          {step === "not_found" && (
            <motion.div key="not_found" {...slideUp}>
              <ErrorScreen title="Gift not found" body="This link may be invalid or the gift may have been cancelled." />
            </motion.div>
          )}

          {step === "error" && (
            <motion.div key="error" {...slideUp}>
              <ErrorScreen title="Something went wrong" body="We couldn't load this gift. Please try again later." />
            </motion.div>
          )}

          {(step === "expired" || step === "cancelled") && (
            <motion.div key="expired" {...slideUp}>
              <GiftCard gift={gift} />
              <div className="mt-6">
                <ErrorScreen icon={Clock} title="This gift has expired" body="Investment gifts are valid for 4 hours. Ask the sender to send a new one." />
              </div>
            </motion.div>
          )}

          {step === "claimed" && (
            <motion.div key="claimed" {...slideUp}>
              <GiftCard gift={gift} />
              <div className="mt-6">
                <ErrorScreen icon={CheckCircle} title="Already claimed" body="This gift has already been claimed. Open the Mint app to view your portfolio." />
              </div>
              <div className="mt-4">
                <Btn onClick={() => window.location.href = "https://app.mymint.co.za"}>
                  Open Mint App <ArrowRight size={16} />
                </Btn>
              </div>
            </motion.div>
          )}

          {step === "preview" && gift && (
            <motion.div key="preview" {...slideUp} className="flex flex-col gap-5">
              <GiftCard gift={gift} />
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
                <p className="text-[15px] font-semibold text-slate-800 text-center">
                  Sign in or create a Mint account to claim this gift
                </p>
                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                  <button
                    className={`flex-1 py-2.5 text-sm font-semibold transition ${authMode === "login" ? "text-white" : "bg-white text-slate-500"}`}
                    style={authMode === "login" ? { background: `linear-gradient(135deg,${MINT_PURPLE},#6d28d9)` } : {}}
                    onClick={() => { setAuthMode("login"); setErr(""); }}
                  >Sign In</button>
                  <button
                    className={`flex-1 py-2.5 text-sm font-semibold transition ${authMode === "signup" ? "text-white" : "bg-white text-slate-500"}`}
                    style={authMode === "signup" ? { background: `linear-gradient(135deg,${MINT_PURPLE},#6d28d9)` } : {}}
                    onClick={() => { setAuthMode("signup"); setErr(""); }}
                  >Create Account</button>
                </div>

                <AnimatePresence mode="wait">
                  {authMode === "login" ? (
                    <motion.div key="login" {...slideUp} className="flex flex-col gap-3">
                      <Input label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.com" />
                      <PwInput label="Password" value={password} onChange={setPw} autoComplete="current-password" />
                      {err && <p className="text-xs text-red-500 font-medium">{err}</p>}
                      <Btn onClick={handleLogin} loading={busy}>
                        <LogIn size={16} /> Sign In
                      </Btn>
                    </motion.div>
                  ) : (
                    <motion.div key="signup" {...slideUp} className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="First name" value={firstName} onChange={setFirst} placeholder="Jane" />
                        <Input label="Last name" value={lastName} onChange={setLast} placeholder="Smith" />
                      </div>
                      <Input label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.com" />
                      <PwInput label="Password" value={password} onChange={setPw} autoComplete="new-password" />
                      {err && <p className="text-xs text-red-500 font-medium">{err}</p>}
                      <Btn onClick={handleSignup} loading={busy}>
                        Create Account <ArrowRight size={16} />
                      </Btn>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {step === "signup_sent" && (
            <motion.div key="signup_sent" {...slideUp} className="flex flex-col gap-5">
              {gift && <GiftCard gift={gift} />}
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center">
                  <span className="text-3xl">📧</span>
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">Check your email</p>
                  <p className="text-sm text-slate-500 mt-1">We sent a confirmation link to <strong>{email}</strong>. Click it and you'll be brought back here to claim your gift.</p>
                </div>
                <Btn secondary onClick={() => { setStep("preview"); setErr(""); }}>
                  Back to sign in
                </Btn>
              </div>
            </motion.div>
          )}

          {step === "claim" && gift && (
            <motion.div key="claim" {...slideUp} className="flex flex-col gap-5">
              <GiftCard gift={gift} />
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
                <div>
                  <p className="text-base font-bold text-slate-900">Claim your gift</p>
                  <p className="text-sm text-slate-500 mt-0.5">You need two things: the 6-digit code the sender shared with you, and your SA ID number.</p>
                </div>
                <Input
                  label="6-digit gift code"
                  value={claimCode}
                  onChange={v => setClaimCode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 482915"
                  maxLength={6}
                />
                <Input
                  label="Your SA ID number"
                  value={idNumber}
                  onChange={v => setId(v.replace(/\D/g, "").slice(0, 13))}
                  placeholder="13-digit ID number"
                  maxLength={13}
                />
                {err && <p className="text-xs text-red-500 font-medium">{err}</p>}
                <Btn onClick={handleClaim} loading={busy}>
                  <Gift size={16} /> Claim Gift
                </Btn>
                <button
                  className="text-xs text-slate-400 text-center hover:text-slate-600"
                  onClick={async () => { await supabase?.auth.signOut(); setStep("preview"); }}
                >
                  Sign out
                </button>
              </div>
            </motion.div>
          )}

          {step === "needs_kyc" && gift && (
            <motion.div key="needs_kyc" {...slideUp} className="flex flex-col gap-5">
              <GiftCard gift={gift} />
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                  <Smartphone size={28} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">Identity verification needed</p>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    To protect everyone on Mint, we verify your identity before allowing you to receive investments. Open the Mint app and complete the quick FICA verification (takes ~2 minutes), then come back here to claim.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <Btn onClick={() => window.location.href = "https://app.mymint.co.za"}>
                    Open Mint App <ArrowRight size={16} />
                  </Btn>
                  <Btn secondary onClick={() => setStep("claim")}>
                    I've completed KYC — try again
                  </Btn>
                </div>
              </div>
            </motion.div>
          )}

          {step === "success" && gift && (
            <motion.div key="success" {...slideUp} className="flex flex-col gap-5">
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-5xl" style={{ background: "linear-gradient(135deg,#c4b5fd,#8b5cf6)" }}>
                  🎉
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">Gift claimed!</p>
                  <p className="text-sm text-slate-500 mt-1">
                    <strong className="text-violet-600">{fmtCents(gift.amount)}</strong> in <strong>{gift.asset_name}</strong> is now in your Mint portfolio.
                  </p>
                </div>
                <Btn onClick={() => window.location.href = "https://app.mymint.co.za"}>
                  View My Portfolio <ArrowRight size={16} />
                </Btn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pb-8 text-center">
        <p className="text-[11px] text-slate-400">Mint (Pty) Ltd · Authorised FSP 55118 · FSCA Regulated</p>
      </div>
    </div>
  );
}
