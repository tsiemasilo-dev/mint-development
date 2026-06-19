// Vercel serverless function — mirrors the Express /api/prices/history endpoint.
// Fetches daily closing prices from Yahoo Finance for a given symbol + period.
// JSE (.JO) prices from Yahoo are in ZAc (cents); divided by 100 to return Rands.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { symbol, period } = req.query;
  if (!symbol || !period) {
    return res.status(400).json({ error: "symbol and period are required" });
  }

  const rangeMap = {
    "1W": "5d",
    "1M": "1mo",
    "3M": "3mo",
    "6M": "6mo",
    "YTD": "ytd",
    "1Y": "1y",
    "ALL": "5y",
  };
  const range = rangeMap[period];
  if (!range) {
    return res.status(400).json({ error: `Unknown period "${period}". Use 1W/1M/3M/6M/YTD/1Y/ALL` });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
    const yahooRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!yahooRes.ok) {
      return res.status(502).json({ error: `Yahoo returned HTTP ${yahooRes.status}` });
    }

    const data = await yahooRes.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      return res.status(404).json({ error: "No price data found for symbol" });
    }

    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const isJSE = symbol.endsWith(".JO");

    const points = timestamps
      .map((ts, i) => {
        const close = closes[i];
        if (close == null) return null;
        const closeRands = isJSE ? close / 100 : close;
        return {
          ts: new Date(ts * 1000).toISOString().split("T")[0],
          close: parseFloat(closeRands.toFixed(4)),
        };
      })
      .filter(Boolean);

    // Derive "as of" time in SAST (Africa/Johannesburg = UTC+2)
    const marketTimeSec = meta.regularMarketTime;
    const asOfTime = marketTimeSec
      ? new Date(marketTimeSec * 1000).toLocaleTimeString("en-ZA", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Africa/Johannesburg",
        })
      : null;

    // Cache for 5 minutes on CDN — prices don't change that fast
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    return res.json({ symbol, period, points, asOfTime, currency: meta.currency || "ZAR" });
  } catch (err) {
    console.error(`[prices/history] ${symbol} (${period}):`, err.message);
    return res.status(500).json({ error: "Failed to fetch price history from Yahoo" });
  }
}
