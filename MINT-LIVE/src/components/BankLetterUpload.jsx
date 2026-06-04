import React, { useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2, X } from "lucide-react";
import { supabase } from "../lib/supabase";

const STATUS = {
  idle: "idle",
  uploading: "uploading",
  match: "match",
  mismatch: "mismatch",
  error: "error",
};

export default function BankLetterUpload({ onVerified }) {
  const [status, setStatus] = useState(STATUS.idle);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  function handleFileSelect(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(selected.type)) {
      setErrorMsg("Please upload a PDF or image file (JPG, PNG).");
      setStatus(STATUS.error);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMsg("File is too large. Maximum size is 10MB.");
      setStatus(STATUS.error);
      return;
    }

    setFile(selected);
    setResult(null);
    setErrorMsg("");
    setStatus(STATUS.idle);
  }

  function clearFile() {
    setFile(null);
    setResult(null);
    setErrorMsg("");
    setStatus(STATUS.idle);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setStatus(STATUS.uploading);
    setErrorMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setErrorMsg("Please sign in first."); setStatus(STATUS.error); return; }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/banking/verify-letter", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Verification failed.");
        setStatus(STATUS.error);
        return;
      }

      setResult(data);
      if (data.match) {
        setStatus(STATUS.match);
        onVerified?.();
      } else {
        setStatus(STATUS.mismatch);
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus(STATUS.error);
    }
  }

  return (
    <div className="space-y-4">
      {status === STATUS.idle && !file && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-violet-300 hover:bg-violet-50/30 transition-all active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Upload size={20} className="text-slate-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Upload bank confirmation letter</p>
            <p className="text-xs text-slate-400 mt-1">PDF or image — max 10MB</p>
          </div>
        </button>
      )}

      {file && status !== STATUS.match && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            {status !== STATUS.uploading && (
              <button onClick={clearFile} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={14} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {file && status === STATUS.idle && (
        <button
          type="button"
          onClick={handleUpload}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1a1a2e] to-[#44296b] text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg"
        >
          Verify Document
        </button>
      )}

      {status === STATUS.uploading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col items-center gap-3 shadow-sm">
          <Loader2 size={24} className="text-violet-600 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Verifying your document</p>
            <p className="text-xs text-slate-400 mt-1">Checking details against your profile…</p>
          </div>
        </div>
      )}

      {status === STATUS.match && result && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800">Verified</p>
              <p className="text-xs text-emerald-600">Bank letter matches your profile.</p>
            </div>
          </div>
          {result.extracted && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
              {result.extracted.account_holder_name && (
                <DetailRow label="Account holder" value={result.extracted.account_holder_name} />
              )}
              {result.extracted.bank_name && (
                <DetailRow label="Bank" value={result.extracted.bank_name} />
              )}
              {result.extracted.account_number && (
                <DetailRow label="Account" value={result.extracted.account_number} />
              )}
            </div>
          )}
        </div>
      )}

      {status === STATUS.mismatch && result && (
        <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <XCircle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">Details don't match</p>
              <p className="text-xs text-red-500">The letter doesn't match your profile.</p>
            </div>
          </div>

          {result.issues?.length > 0 && (
            <div className="space-y-2">
              {result.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600">{issue}</p>
                </div>
              ))}
            </div>
          )}

          {result.checks?.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
              {result.checks.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 capitalize">{c.field.replace("_", " ")}</span>
                  <span className={`text-[11px] font-medium ${c.match ? "text-emerald-600" : "text-red-500"}`}>
                    {c.match ? "Match" : "Mismatch"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={clearFile}
            className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold active:scale-[0.98] transition-all"
          >
            Try a different document
          </button>
        </div>
      )}

      {status === STATUS.error && (
        <div className="bg-red-50 rounded-2xl px-4 py-3 space-y-2">
          <p className="text-sm text-red-600">{errorMsg}</p>
          <button
            type="button"
            onClick={clearFile}
            className="text-xs font-semibold text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept=".pdf,image/*" onChange={handleFileSelect} className="hidden" />
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-xs font-medium text-slate-700">{value}</span>
    </div>
  );
}
