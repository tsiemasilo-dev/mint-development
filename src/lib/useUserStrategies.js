import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { getStrategyPriceHistory } from "./strategyData";

export const useUserStrategies = () => {
  const [data, setData] = useState({
    strategies: [],
    selectedStrategy: null,
    loading: true,
    error: null,
  });

  const fetchUserStrategies = useCallback(async () => {
    if (!supabase) {
      setData((prev) => ({ ...prev, loading: false, error: "Database not connected" }));
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        await fetchFallbackStrategies(null);
        return;
      }

      const userId = userData.user.id;

      const { data: userStrategies, error: strategiesError } = await supabase
        .from("user_strategy_investments")
        .select(`
          id,
          strategy_id,
          invested_amount,
          current_value,
          units_held,
          entry_date,
          last_updated,
          strategies (
            id,
            name,
            short_name,
            description,
            risk_level,
            sector,
            icon_url,
            image_url,
            holdings,
            strategy_metrics (
              as_of_date,
              last_close,
              change_pct,
              r_1w,
              r_1m,
              r_3m,
              r_ytd,
              r_1y
            )
          )
        `)
        .eq("user_id", userId)
        .order("current_value", { ascending: false });

      if (strategiesError) {
        const isMissingTableError = strategiesError.code === "PGRST205" || 
          strategiesError.message?.includes("not found") ||
          strategiesError.message?.includes("does not exist");
        
        if (isMissingTableError) {
          console.warn("user_strategy_investments table may not exist, using fallback:", strategiesError);
          await fetchFallbackStrategies(userId);
        } else {
          console.error("Error fetching user strategies:", strategiesError);
          setData((prev) => ({ ...prev, loading: false, error: strategiesError.message }));
        }
        return;
      }

      const formattedStrategies = (userStrategies || []).map((us) => {
        const strategy = us.strategies;
        const metrics = strategy?.strategy_metrics;
        const latestMetric = Array.isArray(metrics) ? metrics[0] : metrics;
        const changePercent = latestMetric?.r_1m ? (latestMetric.r_1m * 100).toFixed(1) : 0;

        return {
          id: us.id,
          strategyId: us.strategy_id,
          name: strategy?.name || "Unknown Strategy",
          shortName: strategy?.short_name || strategy?.name || "Strategy",
          description: strategy?.description || "",
          riskLevel: strategy?.risk_level || "Moderate",
          sector: strategy?.sector || "",
          iconUrl: strategy?.icon_url,
          imageUrl: strategy?.image_url,
          holdings: strategy?.holdings || [],
          investedAmount: us.invested_amount || 0,
          currentValue: us.current_value || 0,
          unitsHeld: us.units_held || 0,
          entryDate: us.entry_date,
          lastUpdated: us.last_updated,
          previousMonthChange: parseFloat(changePercent),
          metrics: latestMetric,
        };
      });

      setData({
        strategies: formattedStrategies,
        selectedStrategy: formattedStrategies[0] || null,
        loading: false,
        error: null,
      });

    } catch (err) {
      console.error("Error fetching user strategies:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
    }
  }, []);

  const fetchFallbackStrategies = async (userId) => {
    try {
      const { data: strategies, error } = await supabase
        .from("strategies")
        .select(`
          id,
          name,
          short_name,
          description,
          risk_level,
          sector,
          icon_url,
          image_url,
          holdings,
          strategy_metrics (
            as_of_date,
            last_close,
            change_pct,
            r_1w,
            r_1m,
            r_3m,
            r_ytd,
            r_1y
          )
        `)
        .eq("status", "active")
        .limit(5);

      if (error) {
        console.error("Error fetching fallback strategies:", error);
        setData((prev) => ({ ...prev, loading: false, error: error.message }));
        return;
      }

      const formattedStrategies = (strategies || []).map((strategy) => {
        const metrics = strategy?.strategy_metrics;
        const latestMetric = Array.isArray(metrics) ? metrics[0] : metrics;
        const changePercent = latestMetric?.r_1m ? (latestMetric.r_1m * 100).toFixed(1) : 0;

        return {
          id: strategy.id,
          strategyId: strategy.id,
          name: strategy.name || "Unknown Strategy",
          shortName: strategy.short_name || strategy.name || "Strategy",
          description: strategy.description || "",
          riskLevel: strategy.risk_level || "Moderate",
          sector: strategy.sector || "",
          iconUrl: strategy.icon_url,
          imageUrl: strategy.image_url,
          holdings: strategy?.holdings || [],
          investedAmount: 0,
          currentValue: latestMetric?.last_close || 0,
          unitsHeld: 0,
          entryDate: null,
          lastUpdated: latestMetric?.as_of_date,
          previousMonthChange: parseFloat(changePercent),
          metrics: latestMetric,
        };
      });

      setData({
        strategies: formattedStrategies,
        selectedStrategy: formattedStrategies[0] || null,
        loading: false,
        error: null,
      });

    } catch (err) {
      console.error("Error in fallback:", err);
      setData((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  };

  const selectStrategy = useCallback((strategy) => {
    setData((prev) => ({ ...prev, selectedStrategy: strategy }));
  }, []);

  useEffect(() => {
    fetchUserStrategies();
  }, [fetchUserStrategies]);

  return { ...data, selectStrategy, refetch: fetchUserStrategies };
};

export const useStrategyChartData = (strategyId, timeFilter = "W") => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!strategyId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const timeframeMap = {
        "D": "1D",
        "W": "1W",
        "M": "1M",
        "ALL": "1Y",
      };

      const timeframe = timeframeMap[timeFilter] || "1W";

      try {
        const priceHistory = await getStrategyPriceHistory(strategyId, timeframe);

        if (!priceHistory || priceHistory.length === 0) {
          setChartData([]);
          setLoading(false);
          return;
        }

        const formattedData = formatChartData(priceHistory, timeFilter);
        setChartData(formattedData);

      } catch (err) {
        console.error("Error fetching chart data:", err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [strategyId, timeFilter]);

  return { chartData, loading };
};

function formatChartData(priceHistory, timeFilter) {
  if (!priceHistory || priceHistory.length === 0) return [];

  switch (timeFilter) {
    case "D": {
      const last24 = priceHistory.slice(-24);
      return last24.map((p, idx) => {
        const date = new Date(p.ts);
        const hour = date.getHours();
        const ampm = hour >= 12 ? "pm" : "am";
        const displayHour = hour % 12 || 12;
        return {
          day: `${displayHour}${ampm}`,
          value: p.nav,
          highlighted: idx === Math.floor(last24.length / 2),
        };
      });
    }
    case "W": {
      const last7 = priceHistory.slice(-7);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return last7.map((p, idx) => {
        const date = new Date(p.ts);
        return {
          day: dayNames[date.getDay()],
          value: p.nav,
          highlighted: idx === Math.floor(last7.length / 2),
        };
      });
    }
    case "M": {
      const last30 = priceHistory.slice(-30);
      return last30.map((p, idx) => {
        const date = new Date(p.ts);
        return {
          day: date.getDate().toString(),
          value: p.nav,
          highlighted: idx === Math.floor(last30.length / 2),
        };
      });
    }
    case "ALL": {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const grouped = {};

      priceHistory.forEach((p) => {
        const date = new Date(p.ts);
        const key = `${monthNames[date.getMonth()]} '${date.getFullYear().toString().slice(-2)}`;
        grouped[key] = p.nav;
      });

      const entries = Object.entries(grouped);
      return entries.map(([day, value], idx) => ({
        day,
        value,
        highlighted: idx === entries.length - 1,
      }));
    }
    default:
      return priceHistory.map((p) => ({
        day: new Date(p.ts).toLocaleDateString(),
        value: p.nav,
      }));
  }
}
