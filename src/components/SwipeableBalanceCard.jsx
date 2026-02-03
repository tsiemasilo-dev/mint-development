import React, { useState, useMemo } from "react";
import { Eye, EyeOff, TrendingUp, Trophy } from "lucide-react";
import { formatZar } from "../lib/formatCurrency";
import { motion, AnimatePresence } from "framer-motion";
import { Area, ComposedChart, Line, ResponsiveContainer } from "recharts";

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

const generateChartData = (baseValue = 100, trend = "up", points = 20) => {
  const data = [];
  let value = baseValue;
  for (let i = 0; i < points; i++) {
    const change = trend === "up" 
      ? Math.random() * 6 - 1.5 
      : Math.random() * 5 - 3;
    value = Math.max(baseValue * 0.7, value + change);
    data.push({ x: i, value: Number(value.toFixed(2)) });
  }
  return data;
};

const MiniChart = ({ data, color = "#FFD700" }) => {
  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, []);
  
  if (!data || data.length === 0) {
    return <div className="h-full w-full flex items-center justify-center text-white/40 text-xs">No data</div>;
  }
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="transparent"
          fill={`url(#${gradientId})`}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

const MintLogo = ({ className = "", color = "#FFD700" }) => (
  <svg width="60" height="60" viewBox="0 0 100 100" fill="none" className={className}>
    <path
      d="M50 15 L85 85 L15 85 Z"
      fill={color}
      stroke={color}
      strokeWidth="4"
    />
    <circle cx="50" cy="50" r="18" fill="#4B0082" />
    <path d="M50 35 L65 55 L50 50 L35 55 Z" fill={color} />
  </svg>
);

const EMVChip = () => (
  <div className="w-14 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-md border border-gray-500 shadow-inner">
    <div className="grid grid-cols-4 grid-rows-3 gap-0.5 p-1.5 h-full">
      {Array(12).fill(null).map((_, i) => (
        <div key={i} className="bg-yellow-600 rounded-sm" />
      ))}
    </div>
  </div>
);

const ContactlessSymbol = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <path d="M12 20h.01" />
  </svg>
);

const CardFace = ({ children, showChip = true }) => (
  <div
    className="absolute inset-0 rounded-2xl overflow-hidden"
    style={{
      background: 'linear-gradient(135deg, #4B0082 0%, #8A2BE2 100%)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
      fontFamily: "'Courier New', Courier, monospace",
    }}
  >
    <div
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: `
          repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px),
          repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)
        `,
      }}
    />
    <div className="absolute top-0 left-0 w-full h-10 bg-black" />
    {children}
  </div>
);

const SwipeableBalanceCard = ({
  amount = 0,
  totalInvestments = 0,
  investmentChange = 0,
  bestPerformingAssets = [],
  userName = "",
  onPressMintBalance,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(VISIBILITY_STORAGE_KEY);
      return stored !== "false";
    }
    return true;
  });
  const [dragStartX, setDragStartX] = useState(0);
  
  const investmentChartData = useMemo(() => 
    generateChartData(totalInvestments > 0 ? 100 : 50, investmentChange >= 0 ? "up" : "down"), 
    [totalInvestments, investmentChange]
  );
  
  const bestPerformingChartData = useMemo(() => {
    if (bestPerformingAssets.length === 0) return [];
    const avgChange = bestPerformingAssets.reduce((sum, a) => sum + (a.change || 0), 0) / bestPerformingAssets.length;
    return generateChartData(100, avgChange >= 0 ? "up" : "down");
  }, [bestPerformingAssets]);

  const toggleVisibility = (e) => {
    e.stopPropagation();
    setIsVisible((prev) => {
      const next = !prev;
      window.localStorage.setItem(VISIBILITY_STORAGE_KEY, String(next));
      return next;
    });
  };

  const formattedAmount = useMemo(() => formatZar(amount), [amount]);
  const formattedInvestments = useMemo(() => formatZar(totalInvestments), [totalInvestments]);
  const maskedAmount = "••••••••";

  const topAssets = bestPerformingAssets.slice(0, 3);
  const avgPerformance = topAssets.length > 0 
    ? topAssets.reduce((sum, a) => sum + (a.change || 0), 0) / topAssets.length 
    : 0;

  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
  };

  const handleDragEnd = (e) => {
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStartX - clientX;
    const threshold = 50;
    
    if (diff > threshold && currentIndex < 2) {
      setCurrentIndex(currentIndex + 1);
    } else if (diff < -threshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const slideVariants = {
    enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
  };

  const cards = [
    {
      id: "balance",
      content: (
        <CardFace showChip={true}>
          <div className="relative h-full p-5 flex flex-col text-[#FFD700]">
            <div className="flex items-start justify-between mt-10">
              <MintLogo />
              <ContactlessSymbol />
            </div>

            <div className="flex items-center gap-4 mt-2">
              <EMVChip />
            </div>

            <div className="flex-1 flex items-center justify-center">
              <p 
                className="text-3xl md:text-4xl font-bold tracking-wider"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}
              >
                {isVisible ? formattedAmount : maskedAmount}
              </p>
            </div>

            <div className="flex items-end justify-between">
              <p 
                className="text-lg tracking-wide uppercase"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                {userName || "MINT MEMBER"}
              </p>
              <div className="text-right">
                <p 
                  className="text-3xl font-bold"
                  style={{ 
                    fontFamily: 'Arial Black, sans-serif',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.6)'
                  }}
                >
                  VISA
                </p>
                <p 
                  className="text-lg font-medium tracking-wider"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                >
                  Mint
                </p>
              </div>
            </div>
          </div>
        </CardFace>
      ),
    },
    {
      id: "investments",
      content: (
        <CardFace showChip={false}>
          <div className="relative h-full p-5 flex flex-col text-[#FFD700]">
            <div className="flex items-start justify-between mt-10">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm uppercase tracking-wide text-white/80">Total Investments</span>
              </div>
              <ContactlessSymbol />
            </div>

            <div className="mt-4">
              <p 
                className="text-2xl md:text-3xl font-bold tracking-wider"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}
              >
                {isVisible ? formattedInvestments : maskedAmount}
              </p>
              <p className={`text-sm font-semibold mt-1 ${investmentChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {investmentChange >= 0 ? "+" : ""}{investmentChange.toFixed(2)}% this month
              </p>
            </div>

            <div className="flex-1 mt-2 min-h-[50px]">
              <MiniChart data={investmentChartData} color="#FFD700" />
            </div>

            <div className="flex items-end justify-between">
              <span className="text-xs text-white/60">Swipe for more</span>
              <div className="text-right">
                <p 
                  className="text-2xl font-bold"
                  style={{ fontFamily: 'Arial Black, sans-serif' }}
                >
                  VISA
                </p>
                <p className="text-sm font-medium tracking-wider">Mint</p>
              </div>
            </div>
          </div>
        </CardFace>
      ),
    },
    {
      id: "best-performing",
      content: (
        <CardFace showChip={false}>
          <div className="relative h-full p-5 flex flex-col text-[#FFD700]">
            <div className="flex items-start justify-between mt-10">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <span className="text-sm uppercase tracking-wide text-white/80">Best Performers</span>
              </div>
              <ContactlessSymbol />
            </div>

            <div className="mt-3">
              {topAssets.length > 0 ? (
                <div className="flex items-center gap-2">
                  {topAssets.map((asset, idx) => (
                    <div key={asset.symbol || idx} className="flex-1 text-center bg-white/10 rounded-lg py-2 px-1">
                      <p className="text-xs font-semibold text-white/80 truncate">{asset.symbol}</p>
                      <p className={`text-sm font-bold ${(asset.change || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {(asset.change || 0) >= 0 ? "+" : ""}{(asset.change || 0).toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">No investments yet</p>
              )}
              <p className={`text-base font-bold mt-2 ${avgPerformance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                Avg: {avgPerformance >= 0 ? "+" : ""}{avgPerformance.toFixed(2)}%
              </p>
            </div>

            <div className="flex-1 mt-1 min-h-[40px]">
              <MiniChart data={bestPerformingChartData} color="#10B981" />
            </div>

            <div className="flex items-end justify-between">
              <span className="text-xs text-white/60">Swipe back</span>
              <div className="text-right">
                <p 
                  className="text-2xl font-bold"
                  style={{ fontFamily: 'Arial Black, sans-serif' }}
                >
                  VISA
                </p>
                <p className="text-sm font-medium tracking-wider">Mint</p>
              </div>
            </div>
          </div>
        </CardFace>
      ),
    },
  ];

  return (
    <div className="relative select-none" style={{ perspective: '1200px' }}>
      <div
        className="relative w-full overflow-hidden touch-pan-y"
        style={{ 
          aspectRatio: "1.6 / 1",
          transformStyle: 'preserve-3d',
        }}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
      >
        <AnimatePresence mode="wait" custom={currentIndex}>
          <motion.div
            key={currentIndex}
            custom={currentIndex}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onClick={onPressMintBalance}
          >
            {cards[currentIndex].content}
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute top-12 right-14 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
          aria-label={isVisible ? "Hide values" : "Show values"}
        >
          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? "w-6 bg-white"
                : "w-2 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to ${card.id} card`}
          />
        ))}
      </div>
    </div>
  );
};

export default SwipeableBalanceCard;
