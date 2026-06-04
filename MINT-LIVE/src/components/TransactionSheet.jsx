import React, { useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion";
import { useTransactions } from "../lib/useFinancialData";

const NAV_BAR_HEIGHT = 72;
const TOP_GAP = 84;
const COLLAPSED_VISIBLE_RATIO = 0.35;

const formatAmount = (amount) =>
  `${amount >= 0 ? "+" : "-"}R${Math.abs(amount).toFixed(2)}`;

const TransactionSheet = () => {
  const { transactions, loading } = useTransactions(20);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === "undefined" ? 812 : window.innerHeight
  );
  const dragControls = useDragControls();

  const { sheetHeight, collapsedY } = useMemo(() => {
    const usableHeight = Math.max(
      viewportHeight - TOP_GAP - NAV_BAR_HEIGHT,
      360
    );
    const collapsedVisible = Math.max(
      viewportHeight * COLLAPSED_VISIBLE_RATIO,
      240
    );
    const collapsedOffset = Math.max(usableHeight - collapsedVisible, 0);
    return { sheetHeight: usableHeight, collapsedY: collapsedOffset };
  }, [viewportHeight]);
  const y = useMotionValue(collapsedY);

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const target = isExpanded ? 0 : collapsedY;
    const controls = animate(y, target, {
      type: "spring",
      stiffness: 320,
      damping: 32,
    });
    return () => controls.stop();
  }, [collapsedY, isExpanded, y]);

  useEffect(() => {
    document.body.style.overflow = isExpanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleDragEnd = (_event, info) => {
    const velocity = info.velocity.y;
    const currentY = y.get();
    const shouldExpand =
      velocity < -500 || (Math.abs(velocity) < 500 && currentY < collapsedY / 2);
    setIsExpanded(shouldExpand);
  };

  const displayedTransactions = isExpanded
    ? transactions
    : transactions.slice(0, 3);
  const listMaxHeight = Math.max(sheetHeight - 110, 240);

  const hasTransactions = transactions.length > 0;

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-0 z-[40] bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            style={{ bottom: NAV_BAR_HEIGHT }}
          />
        )}
      </AnimatePresence>
      <motion.section
        className="fixed inset-x-0 z-[40] mx-auto w-full max-w-md rounded-t-[32px] bg-white px-4 pb-6 pt-3 shadow-2xl"
        style={{
          y,
          bottom: `calc(${NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
          height: sheetHeight,
          paddingBottom: `calc(${NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
        }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: collapsedY }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
      >
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onPointerDown={(event) => dragControls.start(event)}
          onClick={handleToggle}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleToggle();
            }
          }}
          className="flex cursor-grab flex-col items-center gap-3 pb-2 pt-1 active:cursor-grabbing"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
          <div className="flex w-full items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Transactions
            </h2>
          </div>
        </div>
        <div
          className={`mt-2 grid gap-4 text-xs ${
            isExpanded ? "overflow-y-auto" : "overflow-hidden"
          }`}
          style={{ maxHeight: listMaxHeight }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
            </div>
          ) : hasTransactions ? (
            displayedTransactions.map((row) => (
              <div key={row.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                    {row.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {row.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {row.subtitle}
                    </p>
                  </div>
                </div>
                <span
                  className={
                    row.amount >= 0 ? "text-emerald-500" : "text-rose-500"
                  }
                >
                  {formatAmount(row.amount)}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-500">No transactions yet</p>
              <p className="text-xs text-slate-400 mt-1">Your transactions will appear here</p>
            </div>
          )}
        </div>
      </motion.section>
    </>
  );
};

export default TransactionSheet;
