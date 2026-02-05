import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMarketsSecuritiesWithMetrics, getSecurityPrices } from './marketData';

export function useStockQuotes() {
  const [securities, setSecurities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSecurities = useCallback(async () => {
    try {
      setLoading(true);
      const allSecurities = await getMarketsSecuritiesWithMetrics();
      setSecurities(allSecurities);
      setError(null);
    } catch (err) {
      console.error('Error fetching securities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurities();
  }, [fetchSecurities]);

  const quotes = useMemo(() => {
    const map = {};
    securities.forEach(sec => {
      map[sec.symbol] = {
        symbol: sec.symbol,
        name: sec.name,
        price: sec.currentPrice,
        previousClose: sec.prevClose,
        change: sec.changeAbs,
        changePercent: sec.changePct,
        logo: sec.logo_url,
        id: sec.id,
        returns: sec.returns,
      };
    });
    return map;
  }, [securities]);

  return { quotes, securities, loading, error, refetch: fetchSecurities };
}

export function useStockChart(securityId, timeFilter) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getTimeframe = (filter) => {
    switch (filter) {
      case 'D': return '1D';
      case 'W': return '1W';
      case 'M': return '1M';
      case 'ALL': return 'ALL';
      default: return '1M';
    }
  };

  useEffect(() => {
    if (!securityId) {
      setChartData([]);
      setLoading(false);
      return;
    }

    const fetchChart = async () => {
      try {
        setLoading(true);
        const timeframe = getTimeframe(timeFilter);
        const prices = await getSecurityPrices(securityId, timeframe);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const formatted = (prices || []).map((p, idx) => {
          const date = new Date(p.ts);
          let label;

          if (timeFilter === 'D') {
            label = dayNames[date.getDay()];
          } else if (timeFilter === 'W') {
            label = `${dayNames[date.getDay()]} ${date.getDate()}`;
          } else if (timeFilter === 'M') {
            label = `${date.getDate()} ${monthNames[date.getMonth()]}`;
          } else {
            label = `${monthNames[date.getMonth()]} '${date.getFullYear().toString().slice(-2)}`;
          }

          return {
            day: label,
            value: Number(p.close.toFixed(2)),
            timestamp: new Date(p.ts).getTime(),
            highlighted: idx === Math.floor((prices || []).length / 2),
          };
        });

        setChartData(formatted);
        setError(null);
      } catch (err) {
        console.error('Error fetching stock chart:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [securityId, timeFilter]);

  return { chartData, loading, error };
}
