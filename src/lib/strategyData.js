import { supabase } from "./supabase";

// Simple in-memory cache with timestamps
const cache = {
  strategies: { data: null, timestamp: 0, ttl: 60000 }, // 60 seconds
  publicStrategies: { data: null, timestamp: 0, ttl: 60000 }, // 60 seconds for public strategies
  priceHistory: new Map(), // key: `${strategy_id}_${timeframe}`, value: { data, timestamp, ttl }
};

/**
 * Get all strategies with their latest metrics from Supabase
 * @returns {Promise<Array>} Array of strategies with metrics
 */
export const getStrategiesWithMetrics = async () => {
  const now = Date.now();
  
  // Check cache
  if (cache.strategies.data && (now - cache.strategies.timestamp) < cache.strategies.ttl) {
    console.log("📦 Using cached strategies data");
    return cache.strategies.data;
  }

  if (!supabase) {
    console.error("❌ Supabase client not initialized");
    return [];
  }

  try {
    console.log("🔍 Fetching strategies with metrics from Supabase...");
    
    // Fetch strategies with nested strategy_metrics
    const { data: strategies, error: strategiesError } = await supabase
      .from("strategies")
      .select(`
        *,
        strategy_metrics!strategy_metrics_strategy_id_fkey(
          as_of_date,
          last_close,
          prev_close,
          change_abs,
          change_pct,
          r_1w,
          r_1m,
          r_3m,
          r_6m,
          r_ytd,
          r_1y
        )
      `)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (strategiesError) {
      console.error("❌ Error fetching strategies:", strategiesError);
      return [];
    }

    if (!strategies || strategies.length === 0) {
      console.warn("⚠️ No active strategies found");
      return [];
    }

    // Process strategies to get latest metrics
    const processedStrategies = strategies.map((strategy) => {
      // Get the most recent metric (they should be sorted by as_of_date desc in the query)
      const latestMetric = Array.isArray(strategy.strategy_metrics) && strategy.strategy_metrics.length > 0
        ? strategy.strategy_metrics[0]
        : null;

      return {
        ...strategy,
        // Keep the raw metrics array for reference
        metrics: strategy.strategy_metrics || [],
        // Flatten the latest metric to top level for easy access
        latest_metric: latestMetric,
        // Helper fields for display
        last_close: latestMetric?.last_close || null,
        prev_close: latestMetric?.prev_close || null,
        change_abs: latestMetric?.change_abs || null,
        change_pct: latestMetric?.change_pct || null,
        as_of_date: latestMetric?.as_of_date || null,
        r_1w: latestMetric?.r_1w || null,
        r_1m: latestMetric?.r_1m || null,
        r_3m: latestMetric?.r_3m || null,
        r_6m: latestMetric?.r_6m || null,
        r_ytd: latestMetric?.r_ytd || null,
        r_1y: latestMetric?.r_1y || null,
      };
    });

    // Update cache
    cache.strategies.data = processedStrategies;
    cache.strategies.timestamp = now;

    console.log(`✅ Fetched ${processedStrategies.length} strategies with metrics`);
    return processedStrategies;

  } catch (error) {
    console.error("❌ Unexpected error in getStrategiesWithMetrics:", error);
    return [];
  }
};

/**
 * Get public strategies for OpenStrategies view
 * Only returns active, public strategies ordered by featured status then name
 * @returns {Promise<Array>} Array of public strategies
 */
export const getPublicStrategies = async () => {
  const now = Date.now();
  
  // Check cache
  if (cache.publicStrategies.data && (now - cache.publicStrategies.timestamp) < cache.publicStrategies.ttl) {
    console.log("📦 Using cached public strategies data");
    return cache.publicStrategies.data;
  }

  if (!supabase) {
    console.error("❌ Supabase client not initialized");
    return [];
  }

  try {
    console.log("🔍 Fetching public strategies from Supabase...");
    
    // Fetch only active and public strategies
    const { data: strategies, error } = await supabase
      .from("strategies")
      .select("id, slug, name, short_name, description, risk_level, objective, sector, tags, base_currency, min_investment, provider_name, benchmark_symbol, benchmark_name, fee_type, management_fee_bps, performance_fee_pct, high_water_mark, status, is_public, is_featured, icon_url, image_url, created_at, updated_at")
      .eq("status", "active")
      .eq("is_public", true)
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ Error fetching public strategies:", error);
      return [];
    }

    if (!strategies || strategies.length === 0) {
      console.warn("⚠️ No public strategies found");
      return [];
    }

    // Update cache
    cache.publicStrategies.data = strategies;
    cache.publicStrategies.timestamp = now;

    console.log(`✅ Fetched ${strategies.length} public strategies`);
    return strategies;

  } catch (error) {
    console.error("❌ Unexpected error in getPublicStrategies:", error);
    return [];
  }
};

/**
 * Get a single strategy by ID with its latest metrics
 * @param {string} strategyId - Strategy UUID
 * @returns {Promise<Object|null>} Strategy with metrics or null
 */
export const getStrategyById = async (strategyId) => {
  if (!supabase || !strategyId) {
    console.error("❌ Invalid parameters for getStrategyById");
    return null;
  }

  try {
    const { data: strategy, error } = await supabase
      .from("strategies")
      .select(`
        *,
        strategy_metrics!strategy_metrics_strategy_id_fkey(
          as_of_date,
          last_close,
          prev_close,
          change_abs,
          change_pct,
          r_1w,
          r_1m,
          r_3m,
          r_6m,
          r_ytd,
          r_1y
        )
      `)
      .eq("id", strategyId)
      .single();

    if (error) {
      console.error("❌ Error fetching strategy:", error);
      return null;
    }

    // Get the most recent metric
    const latestMetric = Array.isArray(strategy.strategy_metrics) && strategy.strategy_metrics.length > 0
      ? strategy.strategy_metrics[0]
      : null;

    return {
      ...strategy,
      metrics: strategy.strategy_metrics || [],
      latest_metric: latestMetric,
      last_close: latestMetric?.last_close || null,
      prev_close: latestMetric?.prev_close || null,
      change_abs: latestMetric?.change_abs || null,
      change_pct: latestMetric?.change_pct || null,
      as_of_date: latestMetric?.as_of_date || null,
      r_1w: latestMetric?.r_1w || null,
      r_1m: latestMetric?.r_1m || null,
      r_3m: latestMetric?.r_3m || null,
      r_6m: latestMetric?.r_6m || null,
      r_ytd: latestMetric?.r_ytd || null,
      r_1y: latestMetric?.r_1y || null,
    };

  } catch (error) {
    console.error("❌ Unexpected error in getStrategyById:", error);
    return null;
  }
};

/**
 * Get strategy price history for charting
 * @param {string} strategyId - Strategy UUID
 * @param {string} timeframe - Timeframe (1W, 1M, 3M, 6M, YTD, 1Y)
 * @returns {Promise<Array>} Array of {ts, nav} objects
 */
export const getStrategyPriceHistory = async (strategyId, timeframe = "6M") => {
  if (!supabase || !strategyId) {
    console.error("❌ Invalid parameters for getStrategyPriceHistory");
    return [];
  }

  const cacheKey = `${strategyId}_${timeframe}`;
  const now = Date.now();
  const ttl = 60000; // 60 seconds

  // Check cache
  const cached = cache.priceHistory.get(cacheKey);
  if (cached && (now - cached.timestamp) < ttl) {
    console.log(`📦 Using cached price history for ${cacheKey}`);
    return cached.data;
  }

  try {
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case "1W":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1M":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3M":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6M":
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "YTD":
        startDate = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
        break;
      case "1Y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // Default to 6M
    }

    const { data: prices, error } = await supabase
      .from("strategy_prices")
      .select("ts, nav")
      .eq("strategy_id", strategyId)
      .gte("ts", startDate.toISOString())
      .order("ts", { ascending: true });

    if (error) {
      console.error("❌ Error fetching strategy prices:", error);
      return [];
    }

    const result = prices || [];
    
    // Update cache
    cache.priceHistory.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    console.log(`✅ Fetched ${result.length} price points for strategy ${strategyId} (${timeframe})`);
    return result;

  } catch (error) {
    console.error("❌ Unexpected error in getStrategyPriceHistory:", error);
    return [];
  }
};

/**
 * Format change percentage for display
 * @param {number} changePct - Change as decimal (0.05 = 5%)
 * @returns {string} Formatted string with + or - sign
 */
export const formatChangePct = (changePct) => {
  if (changePct === null || changePct === undefined) return "—";
  const pct = (changePct * 100).toFixed(2);
  return changePct >= 0 ? `+${pct}%` : `${pct}%`;
};

/**
 * Format change absolute for display
 * @param {number} changeAbs - Absolute change value
 * @returns {string} Formatted string with + or - sign
 */
export const formatChangeAbs = (changeAbs) => {
  if (changeAbs === null || changeAbs === undefined) return "—";
  const formatted = Math.abs(changeAbs).toFixed(2);
  return changeAbs >= 0 ? `+${formatted}` : `-${formatted}`;
};

/**
 * Get color class for change (positive = green, negative = red)
 * @param {number} change - Change value (can be abs or pct)
 * @returns {string} Tailwind color class
 */
export const getChangeColor = (change) => {
  if (change === null || change === undefined || change === 0) return "text-slate-500";
  return change > 0 ? "text-emerald-500" : "text-red-500";
};

/**
 * Clear strategy data cache
 */
export const clearStrategyDataCache = () => {
  cache.strategies.data = null;
  cache.strategies.timestamp = 0;
  cache.priceHistory.clear();
  console.log("🗑️ Strategy data cache cleared");
};
