import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { parseOnboardingFlags } from "./checkOnboardingComplete";

export const useOnboardingStatus = ({ enabled = true } = {}) => {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const checkStatus = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setOnboardingComplete(false);
        setLoading(false);
        return;
      }

      // Try API first
      try {
        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          console.log("[useOnboardingStatus] Total Onboarding Status:", json.is_fully_onboarded ? "COMPLETE ✅" : "INCOMPLETE ❌", json);
          setOnboardingComplete(json.is_fully_onboarded === true);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("[useOnboardingStatus] API fallback to DB:", e.message);
      }

      // Fallback to DB
      const { data, error: dbError } = await supabase
        .from("user_onboarding")
        .select("kyc_status, sumsub_raw")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (dbError) throw dbError;

      if (data && data.length > 0) {
        const flags = parseOnboardingFlags(data[0]);
        console.log("[useOnboardingStatus] DB Fallback Flags:", flags.allComplete ? "COMPLETE ✅" : "INCOMPLETE ❌", flags);
        setOnboardingComplete(flags.allComplete);
      } else {
        setOnboardingComplete(false);
      }
    } catch (err) {
      console.error("[useOnboardingStatus] Error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    checkStatus();

    // Listen for changes
    if (!supabase) return;

    const channel = supabase
      .channel('onboarding_status_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_onboarding'
      }, () => checkStatus())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkStatus, enabled]);

  return { onboardingComplete, loading, error, refetch: checkStatus };
};
