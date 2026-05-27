import React, { useState } from "react";
import { Search, User, Wallet, TrendingUp, ArrowLeftRight, Target, Users, Shield, ChevronDown, ChevronUp, X, Trash2 } from "lucide-react";

const fmt = (n) => n != null ? `R${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtDate = (d) => d ? new Date(d).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "—";

const KYC_COLORS = {
  approved: "bg-green-100 text-green-700",
  onboarding_complete: "bg-green-100 text-green-700",
  verified: "bg-green-100 text-green-700",
  GREEN: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  not_started: "bg-gray-100 text-gray-500",
  rejected: "bg-red-100 text-red-700",
  RED: "bg-red-100 text-red-700",
};

function Badge({ label, colorKey }) {
  const cls = KYC_COLORS[colorKey] || "bg-gray-100 text-gray-500";
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
}

function Section({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          <Icon size={16} className="text-purple-500" />
          {title}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 min-w-[140px]">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right max-w-[60%] break-all">{value ?? "—"}</span>
    </div>
  );
}

export default function AdminPage({ onClose }) {
  const [secret, setSecret] = useState(localStorage.getItem("mint_admin_secret") || "");
  const [authed, setAuthed] = useState(!!localStorage.getItem("mint_admin_secret"));
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const login = () => {
    if (!secret.trim()) return;
    localStorage.setItem("mint_admin_secret", secret.trim());
    setAuthed(true);
  };

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSelectedUser(null);
    setDetail(null);
    try {
      const res = await fetch("/api/admin/user-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, query }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Search failed"); setUsers([]); return; }
      setUsers(json.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (user) => {
    setSelectedUser(user);
    setDetail(null);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/user-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, userId: user.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to load"); return; }
      setDetail(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const clearAssets = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/admin/clear-user-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, userId: selectedUser.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Clear failed"); return; }
      setClearConfirm(false);
      await loadDetail(selectedUser);
    } catch (e) {
      setError(e.message);
    } finally {
      setClearing(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f8f6fa] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm">
          <div className="flex items-center justify-center w-14 h-14 bg-purple-100 rounded-2xl mx-auto mb-4">
            <Shield size={28} className="text-purple-600" />
          </div>
          <h1 className="text-xl font-bold text-center text-gray-900 mb-1">Admin Panel</h1>
          <p className="text-sm text-center text-gray-400 mb-6">Enter your admin secret to continue</p>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            placeholder="Admin secret"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-purple-400"
          />
          <button
            onClick={login}
            className="w-full bg-gradient-to-r from-black to-purple-600 text-white rounded-xl py-3 text-sm font-semibold"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-purple-600" />
          <span className="font-bold text-gray-900">Mint Admin</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Search by name, email or Mint number…"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400"
            />
            <button
              onClick={search}
              disabled={loading}
              className="bg-purple-600 text-white rounded-xl px-4 py-2.5 flex items-center gap-1.5 text-sm font-semibold disabled:opacity-50"
            >
              <Search size={15} />
              {loading ? "…" : "Search"}
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          {users.length > 0 && !selectedUser && (
            <div className="mt-3 space-y-1.5">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => loadDetail(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 border border-gray-100 text-left transition"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{u.mint_number}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User detail */}
        {selectedUser && (
          <>
            {/* User header card */}
            <div className="bg-gradient-to-r from-black to-purple-700 rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => { setSelectedUser(null); setDetail(null); }} className="text-white/60 text-xs flex items-center gap-1 hover:text-white">
                  ← Back to results
                </button>
                {!clearConfirm ? (
                  <button onClick={() => setClearConfirm(true)} className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200">
                    <Trash2 size={12} /> Clear assets
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-300">Are you sure?</span>
                    <button onClick={clearAssets} disabled={clearing} className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg disabled:opacity-50">
                      {clearing ? "Clearing…" : "Yes, clear"}
                    </button>
                    <button onClick={() => setClearConfirm(false)} className="text-xs text-white/60">Cancel</button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                  {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                </div>
                <div>
                  <p className="text-lg font-bold">{selectedUser.first_name} {selectedUser.last_name}</p>
                  <p className="text-white/60 text-sm">{selectedUser.email}</p>
                  <p className="text-white/40 text-xs">{selectedUser.mint_number}</p>
                </div>
              </div>
              {detail?.wallet && (
                <div className="mt-4 bg-white/10 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sm text-white/70">Wallet Balance</span>
                  <span className="text-lg font-bold">{fmt(detail.wallet.balance)}</span>
                </div>
              )}
            </div>

            {loading && !detail && (
              <div className="text-center py-10 text-gray-400 text-sm">Loading user data…</div>
            )}

            {detail && (
              <>
                {/* Onboarding / KYC */}
                <Section icon={Shield} title="Onboarding & KYC">
                  <Row label="KYC Status" value={<Badge label={detail.onboarding?.kyc_status || "none"} colorKey={detail.onboarding?.kyc_status} />} />
                  <Row label="Sumsub Answer" value={<Badge label={detail.onboarding?.sumsub_review_answer || "—"} colorKey={detail.onboarding?.sumsub_review_answer} />} />
                  <Row label="ID Number" value={detail.onboarding?.ID_number} />
                  <Row label="Bank" value={detail.onboarding?.bank_name?.toUpperCase()} />
                  <Row label="Account No." value={detail.onboarding?.bank_account_number} />
                  <Row label="Signed At" value={fmtDate(detail.onboarding?.signed_at)} />
                  <Row label="Onboarding Created" value={fmtDate(detail.onboarding?.created_at)} />
                </Section>

                {/* Profile */}
                <Section icon={User} title="Profile" defaultOpen={false}>
                  <Row label="User ID" value={<span className="font-mono text-xs">{detail.profile?.id}</span>} />
                  <Row label="Email" value={detail.profile?.email} />
                  <Row label="Phone" value={detail.profile?.phone_number || detail.profile?.Phone_number} />
                  <Row label="Joined" value={fmtDate(detail.profile?.created_at)} />
                </Section>

                {/* Holdings */}
                <Section icon={TrendingUp} title={`Holdings (${detail.holdings.length})`} defaultOpen={true}>
                  {detail.holdings.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No holdings</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.holdings.map(h => (
                        <div key={h.id} className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2.5">
                          <div>
                            <p className="text-xs font-mono text-gray-500 truncate max-w-[160px]">{h.security_id}</p>
                            <p className="text-xs text-gray-400">Qty: {h.quantity} · Avg: {h.avg_fill ? `R${(h.avg_fill/100).toFixed(2)}` : "—"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-800">{h.market_value ? fmt(h.market_value / 100) : "—"}</p>
                            <Badge label={h.Status || "active"} colorKey={h.Status === "active" ? "approved" : "not_started"} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Transactions */}
                <Section icon={ArrowLeftRight} title={`Transactions (${detail.transactions.length})`} defaultOpen={true}>
                  {detail.transactions.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No transactions</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.transactions.map(t => (
                        <div key={t.id} className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-gray-700 capitalize">{t.type?.replace(/_/g, " ") || "—"}</p>
                            <p className="text-xs text-gray-400">{fmtDate(t.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${t.amount < 0 ? "text-red-500" : "text-green-600"}`}>
                              {t.amount < 0 ? `-${fmt(Math.abs(t.amount))}` : fmt(t.amount)}
                            </p>
                            {t.status && <Badge label={t.status} colorKey={t.status === "completed" ? "approved" : "pending"} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Goals */}
                {detail.goals.length > 0 && (
                  <Section icon={Target} title={`Goals (${detail.goals.length})`} defaultOpen={false}>
                    {detail.goals.map(g => (
                      <div key={g.id} className="bg-gray-50 rounded-xl px-3 py-2.5 mb-2">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium text-gray-700">{g.name}</p>
                          <p className="text-sm font-semibold">{fmt(g.current_amount)} / {fmt(g.target_amount)}</p>
                        </div>
                        {g.deadline && <p className="text-xs text-gray-400 mt-0.5">Deadline: {fmtDate(g.deadline)}</p>}
                      </div>
                    ))}
                  </Section>
                )}

                {/* Family */}
                {detail.family.length > 0 && (
                  <Section icon={Users} title={`Family (${detail.family.length})`} defaultOpen={false}>
                    {detail.family.map(m => (
                      <div key={m.id} className="bg-gray-50 rounded-xl px-3 py-2.5 mb-2 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{m.first_name} {m.last_name}</p>
                          <p className="text-xs text-gray-400 capitalize">{m.relationship} · {m.mint_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{fmt(m.available_balance)}</p>
                          <Badge label={m.kyc_status || "—"} colorKey={m.kyc_status} />
                        </div>
                      </div>
                    ))}
                  </Section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
