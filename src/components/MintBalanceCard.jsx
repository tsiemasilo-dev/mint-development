import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, ChevronRight, Info } from "lucide-react";
import { formatZar } from "../lib/formatCurrency";
import { formatRelativeTime } from "../lib/formatRelativeTime";

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

const MintBalanceCard = ({
  amount,
  changeText,
  updatedAt,
  isLoading = false,
  error = false,
  isEmpty = false,
  onPressMintBalance,
  onRetry,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (stored === "false") {
      setIsVisible(false);
    }
  }, []);

  const toggleVisibility = () => {
    setIsVisible((prev) => {
      const next = !prev;
      window.localStorage.setItem(VISIBILITY_STORAGE_KEY, String(next));
      return next;
    });
  };

  const formattedAmount = useMemo(() => formatZar(amount), [amount]);
  const updatedLabel = useMemo(
    () => formatRelativeTime(updatedAt, { isLoading }),
    [updatedAt, isLoading],
  );

  const shouldShowChange = Boolean(changeText) && isVisible && !isLoading && !error && !isEmpty;
  const maskedAmount = "•••••••";

  const handleCardPress = () => {
    if (error && onRetry) {
      onRetry();
      return;
    }
    if (onPressMintBalance) {
      onPressMintBalance();
    }
  };

  return (
    <div
      className="glass-card p-5 text-white"
      role="button"
      tabIndex={0}
      onClick={handleCardPress}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCardPress();
        }
      }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">MINT BALANCE</p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleVisibility();
          }}
          aria-label={isVisible ? "Hide balance" : "Show balance"}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
        >
          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="h-9 w-40 rounded-full bg-white/20 animate-pulse" />
        ) : error ? (
          <p className="text-lg font-semibold text-white">Mint Balance unavailable</p>
        ) : isEmpty ? (
          <p className="text-lg font-semibold text-white">No balance yet</p>
        ) : (
          <p className="text-3xl font-semibold">
            {isVisible ? formattedAmount : maskedAmount}
          </p>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-white/70">Tap to retry</p>
      ) : shouldShowChange ? (
        <div className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/80">
          {changeText}
        </div>
      ) : (
        <div className="mt-3 h-6" />
      )}

      <p className="mt-3 flex items-center gap-2 text-xs text-white/70">
        <span>Across your investments and available credit</span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30 text-white/70">
          <Info className="h-3 w-3" />
        </span>
      </p>

      <div className="mt-4 flex items-center justify-between text-[10px] text-white/60">
        <span>{updatedLabel || ""}</span>
        <span className="flex items-center gap-1 text-white/70">
          View breakdown
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
};

export default MintBalanceCard;
