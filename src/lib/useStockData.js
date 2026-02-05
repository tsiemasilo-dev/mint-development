import { useState, useEffect, useCallback, useRef } from 'react';

const CACHE_DURATION = 60 * 1000;
const quoteCache = {};
const chartCache = {};

export function useStockQuotes(symbols) {
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const symbolsKey = symbols.join(',');

  const fetchQuotes = useCallback(async () => {
    if (!symbols.length) return;
    
    const cacheKey = symbolsKey;
    const cached = quoteCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setQuotes(cached.data);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/stocks/quote?symbols=${symbolsKey}`);
      if (!response.ok) throw new Error('Failed to fetch quotes');
      const data = await response.json();
      
      quoteCache[cacheKey] = { data, timestamp: Date.now() };
      setQuotes(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching stock quotes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbolsKey]);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  return { quotes, loading, error, refetch: fetchQuotes };
}

export function useStockChart(symbol, timeFilter) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getParams = (filter) => {
    switch (filter) {
      case 'D': return { range: '1d', interval: '5m' };
      case 'W': return { range: '5d', interval: '15m' };
      case 'M': return { range: '1mo', interval: '1h' };
      case 'ALL': return { range: '1y', interval: '1d' };
      default: return { range: '5d', interval: '15m' };
    }
  };

  useEffect(() => {
    if (!symbol) return;

    const cacheKey = `${symbol}_${timeFilter}`;
    const cached = chartCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setChartData(cached.data);
      setLoading(false);
      return;
    }

    const fetchChart = async () => {
      try {
        setLoading(true);
        const { range, interval } = getParams(timeFilter);
        const response = await fetch(`/api/stocks/chart?symbol=${symbol}&range=${range}&interval=${interval}`);
        if (!response.ok) throw new Error('Failed to fetch chart');
        const data = await response.json();
        
        let points = data.chartPoints || [];
        
        if (timeFilter === 'W') {
          const dayMap = {};
          points.forEach(p => {
            const key = p.day;
            if (!dayMap[key] || p.timestamp > dayMap[key].timestamp) {
              dayMap[key] = p;
            }
          });
          const uniqueDays = Object.values(dayMap).sort((a, b) => a.timestamp - b.timestamp);
          if (points.length > 30) {
            const step = Math.ceil(points.length / 25);
            points = points.filter((_, i) => i % step === 0 || i === points.length - 1);
          }
        }
        
        if (timeFilter === 'D' && points.length > 40) {
          const step = Math.ceil(points.length / 30);
          points = points.filter((_, i) => i % step === 0 || i === points.length - 1);
        }

        if (timeFilter === 'M' && points.length > 30) {
          const step = Math.ceil(points.length / 25);
          points = points.filter((_, i) => i % step === 0 || i === points.length - 1);
        }

        if (timeFilter === 'ALL' && points.length > 50) {
          const step = Math.ceil(points.length / 40);
          points = points.filter((_, i) => i % step === 0 || i === points.length - 1);
        }
        
        chartCache[cacheKey] = { data: points, timestamp: Date.now() };
        setChartData(points);
        setError(null);
      } catch (err) {
        console.error('Error fetching stock chart:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [symbol, timeFilter]);

  return { chartData, loading, error };
}
