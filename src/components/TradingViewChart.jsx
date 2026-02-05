import React, { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, LineStyle, AreaSeries } from 'lightweight-charts';

const TradingViewChart = ({
  data = [],
  height = 220,
  lineColor = '#7c3aed',
  areaTopColor = 'rgba(139, 92, 246, 0.25)',
  areaBottomColor = 'rgba(139, 92, 246, 0)',
  backgroundColor = 'transparent',
  showGrid = false,
  showTimeScale = true,
  showPriceScale = false,
  showCrosshair = true,
  autoFit = true,
  lineWidth = 2.5,
  priceFormat,
  timeFormat,
  onCrosshairMove,
  className = '',
  style = {},
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const handleResize = useCallback(() => {
    if (chartRef.current && chartContainerRef.current) {
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    }
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor: '#94a3b8',
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 11,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: { visible: false },
        horzLines: {
          visible: showGrid,
          color: 'rgba(148, 163, 184, 0.08)',
          style: LineStyle.Solid,
        },
      },
      timeScale: {
        visible: showTimeScale,
        borderVisible: false,
        timeVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        tickMarkFormatter: timeFormat || undefined,
      },
      rightPriceScale: {
        visible: showPriceScale,
        borderVisible: false,
        scaleMargins: {
          top: 0.15,
          bottom: 0.05,
        },
      },
      crosshair: {
        mode: showCrosshair ? 0 : 3,
        vertLine: {
          color: 'rgba(139, 92, 246, 0.3)',
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: false,
        },
        horzLine: {
          color: 'rgba(139, 92, 246, 0.3)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#7c3aed',
        },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: false,
        mouseWheel: false,
        pinch: false,
      },
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      lineWidth: lineWidth,
      lineStyle: LineStyle.Solid,
      crosshairMarkerVisible: showCrosshair,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: lineColor,
      crosshairMarkerBackgroundColor: '#ffffff',
      crosshairMarkerBorderWidth: 2,
      priceFormat: priceFormat || {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    if (onCrosshairMove) {
      chart.subscribeCrosshairMove((param) => {
        if (param.time) {
          const price = param.seriesData.get(areaSeries);
          onCrosshairMove({ time: param.time, value: price?.value });
        } else {
          onCrosshairMove(null);
        }
      });
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, backgroundColor, lineColor, areaTopColor, areaBottomColor, showGrid, showTimeScale, showPriceScale, showCrosshair, lineWidth]);

  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return;

    const formattedData = data
      .map((point) => {
        let time;
        let value;

        if (point.time && point.value != null) {
          time = point.time;
          value = Number(point.value);
        } else if (point.timestamp && point.value != null) {
          time = point.timestamp;
          value = Number(point.value);
        } else if (point.ts && point.close != null) {
          time = point.ts;
          value = Number(point.close);
        } else if (point.date && point.value != null) {
          time = point.date;
          value = Number(point.value);
        } else {
          return null;
        }

        if (typeof time === 'string' && time.includes('T')) {
          time = time.split('T')[0];
        }

        if (isNaN(value) || !time) return null;

        return { time, value };
      })
      .filter(Boolean);

    const uniqueData = [];
    const seen = new Set();
    for (const point of formattedData) {
      if (!seen.has(point.time)) {
        seen.add(point.time);
        uniqueData.push(point);
      }
    }

    uniqueData.sort((a, b) => (a.time > b.time ? 1 : -1));

    if (uniqueData.length > 0) {
      try {
        seriesRef.current.setData(uniqueData);
        if (autoFit && chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } catch (e) {
        console.warn('TradingView chart data error:', e);
      }
    }
  }, [data, autoFit]);

  return (
    <div
      ref={chartContainerRef}
      className={className}
      style={{
        width: '100%',
        height: height,
        ...style,
      }}
    />
  );
};

export const TradingViewSparkline = ({
  data = [],
  height = 40,
  lineColor = '#7c3aed',
  areaTopColor = 'rgba(139, 92, 246, 0.15)',
  areaBottomColor = 'rgba(139, 92, 246, 0)',
  lineWidth = 1.5,
  className = '',
  style = {},
}) => {
  return (
    <TradingViewChart
      data={data}
      height={height}
      lineColor={lineColor}
      areaTopColor={areaTopColor}
      areaBottomColor={areaBottomColor}
      showGrid={false}
      showTimeScale={false}
      showPriceScale={false}
      showCrosshair={false}
      lineWidth={lineWidth}
      className={className}
      style={style}
    />
  );
};

export default TradingViewChart;
