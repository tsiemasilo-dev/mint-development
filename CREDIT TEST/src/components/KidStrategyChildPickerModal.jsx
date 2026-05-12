import { useEffect, useState } from "react";
import { X, ChevronRight, User, Users } from "lucide-react";
import { supabase } from "../lib/supabase";

const formatWalletCents = (value) =>
  `R${(Number(value || 0) / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function KidStrategyChildPickerModal({ isOpen, onClose, onSelectChild, onSelectSelf }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }
        const { data } = await supabase
          .from("family_members")
          .select("id, first_name, last_name, available_balance, linked_user_id")
          .eq("primary_user_id", session.user.id)
          .eq("relationship", "child");
        setChildren(data || []);
      } catch {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 px-4 pb-6">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-[32px] bg-white shadow-2xl overflow-hidden">
        {/* top accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#8b5cf6,#6366f1)" }} />
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="px-6 pt-4 pb-8">
          {/* header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-base font-bold text-slate-900">Who are you purchasing for?</p>
              <p className="text-xs text-slate-400 mt-0.5">Step 1 of 2 - Choose an account</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onSelectSelf?.()}
                className="w-full flex items-center gap-3 rounded-2xl border border-slate-100 bg-white shadow-sm px-4 py-3.5 text-left hover:border-violet-200 hover:shadow-md transition active:scale-[0.98]"
              >
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#1e293b,#475569)" }}
                >
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Myself</p>
                  <p className="text-xs text-slate-500 mt-0.5">Use my own portfolio and wallet</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </button>

              {children.length === 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  <Users className="h-4 w-4 text-slate-400" />
                  No child accounts linked yet.
                </div>
              )}

              {children.map((child) => {
                const initials = [child.first_name, child.last_name]
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("");
                return (
                  <button
                    key={child.id}
                    onClick={() => onSelectChild(child)}
                    className="w-full flex items-center gap-3 rounded-2xl border border-slate-100 bg-white shadow-sm px-4 py-3.5 text-left hover:border-violet-200 hover:shadow-md transition active:scale-[0.98]"
                  >
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)" }}
                    >
                      {initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {child.first_name} {child.last_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Balance: {formatWalletCents(child.available_balance)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
