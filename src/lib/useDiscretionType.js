import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// Reads the user's discretionary mandate choice from
// user_onboarding.sumsub_raw.mandate_data.discretionType ("full" | "limited").
// Limited-discretion users may not trade/interact with strategies.
export function useDiscretionType() {
  const [discretionType, setDiscretionType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!supabase) { if (!cancelled) setLoading(false); return; }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { if (!cancelled) setLoading(false); return; }

        const { data } = await supabase
          .from("user_onboarding")
          .select("sumsub_raw")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let raw = {};
        try { raw = typeof data?.sumsub_raw === "string" ? JSON.parse(data.sumsub_raw) : (data?.sumsub_raw || {}); } catch { raw = {}; }
        const dt = raw?.mandate_data?.discretionType || null;
        if (!cancelled) { setDiscretionType(dt); setLoading(false); }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { discretionType, loading, isLimited: discretionType === "limited" };
}
