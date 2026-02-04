import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

export const useSumsubStatus = () => {
  const [status, setStatus] = useState({
    loading: true,
    kycVerified: false,
    kycPending: false,
    kycNeedsResubmission: false,
    reviewStatus: null,
    reviewAnswer: null,
    rejectLabels: [],
  });

  const fetchStatus = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    
    try {
      // Get current user
      if (!supabase) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const userId = userData.user.id;
      const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
      
      // Fetch directly from Sumsub via our API
      const response = await fetch(`${apiBase}/api/sumsub/sync-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const result = await response.json();
      console.log("Sumsub status fetched:", result);
      
      if (result.success) {
        const reviewAnswer = result.applicant?.reviewAnswer;
        const reviewStatus = result.applicant?.reviewStatus;
        const rejectLabels = result.applicant?.rejectLabels || [];
        
        // Determine status based on Sumsub response
        let kycVerified = false;
        let kycPending = false;
        let kycNeedsResubmission = false;
        
        if (reviewAnswer === "GREEN") {
          kycVerified = true;
        } else if (reviewAnswer === "RED") {
          kycNeedsResubmission = true;
        } else if (reviewStatus === "pending" || reviewStatus === "queued") {
          kycPending = true;
        } else if (reviewStatus === "onHold" || result.status === "needs_resubmission") {
          kycNeedsResubmission = true;
        } else if (result.status === "not_verified" || result.status === "not_started") {
          // Not verified yet
        } else if (result.status === "pending") {
          kycPending = true;
        } else if (result.status === "verified") {
          kycVerified = true;
        } else if (result.status === "needs_resubmission") {
          kycNeedsResubmission = true;
        }
        
        setStatus({
          loading: false,
          kycVerified,
          kycPending,
          kycNeedsResubmission,
          reviewStatus,
          reviewAnswer,
          rejectLabels,
        });
      } else {
        // API call failed, fallback to database
        const { data } = await supabase
          .from("required_actions")
          .select("kyc_verified, kyc_pending, kyc_needs_resubmission")
          .eq("user_id", userId)
          .maybeSingle();
        
        setStatus({
          loading: false,
          kycVerified: data?.kyc_verified || false,
          kycPending: data?.kyc_pending || false,
          kycNeedsResubmission: data?.kyc_needs_resubmission || false,
          reviewStatus: null,
          reviewAnswer: null,
          rejectLabels: [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch Sumsub status:", error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { ...status, refetch: fetchStatus };
};
