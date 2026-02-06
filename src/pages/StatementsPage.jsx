import React, { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, MoreHorizontal, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useProfile } from "../lib/useProfile";
import NotificationBell from "../components/NotificationBell";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/formatCurrency";

const StatementsPage = ({ onOpenNotifications }) => {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState("strategy");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(9);
  const [selectedCard, setSelectedCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [holdingsRows, setHoldingsRows] = useState([]);
  const [holdingsRaw, setHoldingsRaw] = useState([]);
  const [strategyRows, setStrategyRows] = useState([]);
  const [financialsRows, setFinancialsRows] = useState([]);
  const [strategiesLoading, setStrategiesLoading] = useState(true);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [financialsLoading, setFinancialsLoading] = useState(true);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const calculatePerPage = () => {
      const viewportHeight = window.innerHeight;
      const availableHeight = viewportHeight - 380;
      const cardHeight = 50;
      const calculatedPerPage = Math.max(4, Math.floor(availableHeight / cardHeight));
      setPerPage(calculatedPerPage);
    };

    calculatePerPage();
    window.addEventListener("resize", calculatePerPage);
    return () => window.removeEventListener("resize", calculatePerPage);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadStrategies = async () => {
      if (!supabase) {
        if (isMounted) setStrategiesLoading(false);
        return;
      }

      try {
        const { data: strategies, error } = await supabase
          .from("strategies")
          .select("id, name, short_name, description, risk_level, holdings, strategy_metrics(as_of_date, last_close, change_pct, r_1m)")
          .eq("status", "active");

        if (error) throw error;

        const mapped = (strategies || []).map((strategy) => {
          const metrics = strategy.strategy_metrics;
          const latestMetric = Array.isArray(metrics) ? metrics[0] : metrics;
          const asOfDate = latestMetric?.as_of_date ? new Date(latestMetric.as_of_date) : null;
          const dateLabel = asOfDate
            ? asOfDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
            : "—";
          const desc = strategy.description
            ? strategy.description.length > 40
              ? strategy.description.slice(0, 40) + "…"
              : strategy.description
            : "—";

          return {
            type: "Strategy",
            icon: "📊",
            title: strategy.name || "—",
            desc,
            date: dateLabel,
            amount: formatCurrency(latestMetric?.last_close || 0),
            meta: strategy.risk_level || "—",
            time: "—",
            flow: "out",
            strategyName: strategy.name || "—",
            allocation: "—",
            capitalInvested: "—",
            currentValue: latestMetric?.last_close ? formatCurrency(latestMetric.last_close) : "—",
            unrealisedPL: "—",
            realisedPL: "—",
            totalPL: "—",
          };
        });

        if (isMounted) {
          setStrategyRows(mapped);
          setStrategiesLoading(false);
        }
      } catch (error) {
        console.error("Failed to load strategies", error);
        if (isMounted) setStrategiesLoading(false);
      }
    };

    loadStrategies();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHoldings = async () => {
      if (!supabase || !profile?.id) {
        if (isMounted) setHoldingsLoading(false);
        return;
      }

      try {
        const { data: holdings, error } = await supabase
          .from("stock_holdings")
          .select("id, user_id, security_id, quantity, avg_fill, market_value, unrealized_pnl, as_of_date, created_at, updated_at, Status")
          .eq("user_id", profile.id);

        if (error) throw error;
        if (!holdings || holdings.length === 0) {
          if (isMounted) {
            setHoldingsRows([]);
            setHoldingsLoading(false);
          }
          return;
        }

        const securityIds = [...new Set(holdings.map((holding) => holding.security_id).filter(Boolean))];
        let securities = [];

        if (securityIds.length > 0) {
          const { data: securityRows, error: securitiesError } = await supabase
            .from("securities")
            .select("id, symbol, exchange, name, logo_url, last_price")
            .in("id", securityIds);

          if (securitiesError) throw securitiesError;
          securities = securityRows || [];
        }

        const securitiesById = new Map(securities.map((security) => [security.id, security]));

        const mappedHoldings = holdings.map((holding) => {
          const security = securitiesById.get(holding.security_id);
          const symbol = security?.symbol || "—";
          const exchange = security?.exchange || "";
          const title = security?.name || symbol;
          const asOfValue = holding.as_of_date || holding.updated_at || holding.created_at;
          const asOfDate = asOfValue ? new Date(asOfValue) : null;
          const dateLabel = asOfDate
            ? asOfDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
            : "—";
          const timeLabel = asOfDate
            ? asOfDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : "—";
          const quantity = Number(holding.quantity);
          const avgFill = Number(holding.avg_fill);
          const lastPrice = Number(security?.last_price);
          const marketPriceValue = Number.isFinite(lastPrice) ? lastPrice * 100 : NaN;
          const marketValue = Number.isFinite(marketPriceValue) && Number.isFinite(quantity)
            ? marketPriceValue * quantity
            : NaN;
          const formattedQty = Number.isFinite(quantity)
            ? quantity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 })
            : "—";
          const formattedAvg = Number.isFinite(avgFill) ? formatCurrency(avgFill) : "—";
          const formattedPrice = Number.isFinite(marketPriceValue) ? formatCurrency(marketPriceValue) : "—";
          const formattedValue = Number.isFinite(marketValue) ? formatCurrency(marketValue) : "—";
          const computedUnrealized = Number.isFinite(marketPriceValue) && Number.isFinite(avgFill) && Number.isFinite(quantity)
            ? (marketPriceValue - avgFill) * quantity
            : NaN;
          const formattedPnl = Number.isFinite(computedUnrealized)
            ? `${computedUnrealized < 0 ? "-" : "+"}${formatCurrency(Math.abs(computedUnrealized))}`
            : "—";

          return {
            type: "Holdings",
            icon: null,
            logoUrl: security?.logo_url || null,
            title,
            desc: exchange ? `${symbol} · ${exchange}` : symbol,
            instrument: title,
            ticker: symbol,
            quantity: formattedQty,
            avgCost: formattedAvg,
            marketPrice: formattedPrice,
            marketValue: formattedValue,
            unrealizedPL: formattedPnl,
            date: dateLabel,
            amount: formattedValue,
            meta: "Market value",
            time: timeLabel,
            flow: "in",
            status: holding.Status || null,
          };
        });

        if (isMounted) {
          setHoldingsRows(mappedHoldings);
          setHoldingsRaw(
            holdings.map((holding) => ({
              id: holding.id,
              quantity: Number(holding.quantity),
              marketValue: Number(holding.market_value),
              lastPrice: Number(securitiesById.get(holding.security_id)?.last_price),
            })),
          );
          setHoldingsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load stock holdings", error);
        if (isMounted) setHoldingsLoading(false);
      }
    };

    loadHoldings();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadFinancials = async () => {
      if (!supabase || !profile?.id) {
        if (isMounted) setFinancialsLoading(false);
        return;
      }

      try {
        const { data: allocations, error } = await supabase
          .from("allocations")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped = (allocations || []).map((alloc) => {
          const createdAt = alloc.created_at ? new Date(alloc.created_at) : null;
          const dateLabel = createdAt
            ? createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
            : "—";
          const timeLabel = createdAt
            ? createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : "—";

          return {
            type: "Reports",
            icon: "📄",
            title: alloc.type || alloc.description || "Allocation",
            desc: alloc.description || alloc.type || "—",
            date: dateLabel,
            amount: alloc.amount != null ? formatCurrency(Number(alloc.amount)) : "—",
            meta: alloc.type || "Allocation",
            time: timeLabel,
            flow: alloc.type === "Withdrawal" ? "out" : "in",
          };
        });

        if (isMounted) {
          setFinancialsRows(mapped);
          setFinancialsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load financials", error);
        if (isMounted) setFinancialsLoading(false);
      }
    };

    loadFinancials();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    const updateMarketValues = async () => {
      if (!supabase || activeTab !== "holdings" || holdingsRaw.length === 0) return;

      const updates = holdingsRaw
        .map((holding) => {
          if (!Number.isFinite(holding.quantity) || !Number.isFinite(holding.lastPrice)) return null;
          const computedValue = holding.lastPrice * holding.quantity;
          if (!Number.isFinite(computedValue)) return null;
          const existingValue = Number.isFinite(holding.marketValue) ? holding.marketValue : null;
          const needsUpdate = existingValue == null || Math.abs(existingValue - computedValue) > 0.01;
          if (!needsUpdate) return null;
          return { id: holding.id, market_value: computedValue };
        })
        .filter(Boolean);

      if (updates.length === 0) return;

      try {
        await Promise.all(
          updates.map((update) =>
            supabase.from("stock_holdings").update({ market_value: update.market_value }).eq("id", update.id),
          ),
        );
      } catch (error) {
        console.error("Failed to update market values", error);
      }
    };

    updateMarketValues();
  }, [activeTab, holdingsRaw]);

  const combinedRows = [...strategyRows, ...holdingsRows, ...financialsRows];

  const filtered = combinedRows.filter((row) => {
    if (activeTab === "strategy") return row.type === "Strategy" || row.type === "Holdings";
    if (activeTab === "holdings") return row.type === "Holdings";
    if (activeTab === "financials") return row.type === "Reports";
    return true;
  });

  const searchFiltered = searchQuery.trim()
    ? filtered.filter((row) => row.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : filtered;

  const isLoading =
    (activeTab === "strategy" && (strategiesLoading || holdingsLoading)) ||
    (activeTab === "holdings" && holdingsLoading) ||
    (activeTab === "financials" && financialsLoading);

  const pages = Math.max(1, Math.ceil(searchFiltered.length / perPage));
  const start = (page - 1) * perPage;
  const pageRows = searchFiltered.slice(start, start + perPage);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  const strategyDetails = selectedCard
    ? {
        strategyName: selectedCard.strategyName || selectedCard.title || "—",
        allocation: selectedCard.allocation || "—",
        capitalInvested: selectedCard.capitalInvested || "—",
        currentValue: selectedCard.currentValue || selectedCard.amount || "—",
        unrealisedPL: selectedCard.unrealisedPL || selectedCard.unrealizedPL || "—",
        realisedPL: selectedCard.realisedPL || "—",
        totalPL: selectedCard.totalPL || "—",
      }
    : null;

  const handleDownloadPdf = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const rows = searchFiltered.map((row) => [row.title, row.date, row.amount, row.time]);
    const pageHeight = doc.internal.pageSize.getHeight();
    const ensurePageSpace = (startY, minSpace = 120) => {
      if (startY + minSpace > pageHeight - 40) {
        doc.addPage();
        return 40;
      }
      return startY;
    };

    try {
      const response = await fetch("/assets/mint-logo.svg");
      if (response.ok) {
        const svgText = await response.text();
        const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          doc.addImage(dataUrl, "PNG", 32, 24, 60, 28);
        }
        URL.revokeObjectURL(url);
      }
    } catch (error) {
    }

    doc.setFont("times", "normal");
    doc.setFontSize(18);
    doc.text("MINT CLIENT ACCOUNT STATEMENT", 32, 86, { align: "left" });

    doc.setFontSize(12);
    doc.text("Statement Period: [Start Date] – [End Date]", 32, 112, { align: "left" });
    doc.text(`Client Name: ${displayName || "[Full Legal Name]"}`, 32, 130, { align: "left" });
    doc.text(`Client ID: ${profile?.idNumber || "[Internal ID]"}`, 32, 148, { align: "left" });
    doc.text("Account Number: [Platform Account Reference]", 32, 166, { align: "left" });
    doc.text("Custodian: [Bank X]", 32, 184, { align: "left" });
    doc.text(`Statement Date: ${new Date().toLocaleDateString("en-GB")}`, 32, 202, { align: "left" });
    doc.text("Base Currency: ZAR", 32, 220, { align: "left" });

    doc.setFontSize(18);
    doc.text("SECTION 1: ACCOUNT SUMMARY (TOP OF STATEMENT)", 32, 264, { align: "left" });

    autoTable(doc, {
      head: [["Metric", "Amount (ZAR)"]],
      body: [
        ["Opening Balance", "xxx,xxx.xx"],
        ["Total Contributions", "xxx,xxx.xx"],
        ["Total Withdrawals", "(xx,xxx.xx)"],
        ["Net Cash Flow", "xxx,xxx.xx"],
        ["Investment Market Value", "xxx,xxx.xx"],
        ["Cash Balance", "xx,xxx.xx"],
        ["Total Account Value", "xxx,xxx.xx"],
        ["Total Platform P/L", "+ / – xx,xxx.xx"],
        ["Total Platform P/L (%)", "+ / – x.xx%"],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 300 },
        1: { cellWidth: 200, halign: "right" },
      },
      margin: { top: 288, left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const notesStartY = (doc.lastAutoTable?.finalY || 320) + 20;
    doc.setFontSize(12);
    doc.text("Notes:", 32, notesStartY, { align: "left" });
    const notesLines = [
      "• \"Total Platform P/L\" reflects aggregate realised and unrealised performance across all strategies and self-directed activity on the platform.",
      "• Cash balances may be allocated or temporarily unallocated depending on strategy rebalancing cycles.",
    ];
    doc.text(notesLines, 32, notesStartY + 16, {
      align: "left",
      maxWidth: 530,
    });

    const section2StartY = ensurePageSpace(notesStartY + 100, 140);
    doc.setFontSize(18);
    doc.text("SECTION 2: STRATEGY EXPOSURE & PERFORMANCE", 32, section2StartY, { align: "left" });

    autoTable(doc, {
      head: [["Strategy Name", "Allocation (%)", "Capital Invested", "Current Value", "Unrealised P/L", "Realised P/L", "Total P/L"]],
      body: [
        ["MINT SA\nDefensive Income\nCompounders", "xx%", "xxx,xxx.xx", "xxx,xxx.xx", "xx,xxx.xx", "x,xxx.xx", "xx,xxx.xx"],
        ["MINT Cash\nAllocation", "xx%", "xx,xxx.xx", "xx,xxx.xx", "–", "–", "–"],
        ["Self-Directed\nPortfolio", "xx%", "xx,xxx.xx", "xx,xxx.xx", "x,xxx.xx", "x,xxx.xx", "xx,xxx.xx"],
        ["Total", "100%", "xxx,xxx.xx", "xxx,xxx.xx", "xx,xxx.xx", "x,xxx.xx", "xx,xxx.xx"],
      ],
      styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      pageBreak: "auto",
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 65, halign: "right" },
        2: { cellWidth: 80, halign: "right" },
        3: { cellWidth: 80, halign: "right" },
        4: { cellWidth: 80, halign: "right" },
        5: { cellWidth: 70, halign: "right" },
        6: { cellWidth: 70, halign: "right" },
      },
      startY: section2StartY + 24,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const section2NotesY = (doc.lastAutoTable?.finalY || section2StartY + 100) + 20;
    doc.setFontSize(12);
    doc.text("Notes:", 32, section2NotesY, { align: "left" });
    const section2Notes = [
      "• Strategies may temporarily hold cash as part of portfolio construction, rebalancing, or risk management.",
      "• Strategy allocations are indicative as at statement date and may change without prior notice.",
    ];
    doc.text(section2Notes, 32, section2NotesY + 16, {
      align: "left",
      maxWidth: 530,
    });

    const section3StartY = ensurePageSpace(section2NotesY + 70, 120);
    doc.setFontSize(18);
    doc.text("SECTION 3: HOLDINGS SUMMARY", 32, section3StartY, { align: "left" });

    const holdingsForPdf = holdingsRows.filter((row) => row.type === "Holdings");
    const holdingsTableRows = holdingsForPdf.map((row) => [
      row.instrument || row.title || "—",
      row.ticker || "—",
      row.quantity || "—",
      row.avgCost || "—",
      row.marketPrice || "—",
      row.marketValue || "—",
      row.unrealizedPL || "—",
    ]);

    autoTable(doc, {
      head: [["Instrument", "Ticker", "Quantity", "Avg Cost", "Market Price", "Market Value", "Unrealised P/L"]],
      body: holdingsTableRows.length > 0 ? holdingsTableRows : [],
      styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      pageBreak: "auto",
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: "center" },
        2: { cellWidth: 60, halign: "right" },
        3: { cellWidth: 60, halign: "right" },
        4: { cellWidth: 70, halign: "right" },
        5: { cellWidth: 85, halign: "right" },
        6: { cellWidth: 85, halign: "right" },
      },
      startY: section3StartY + 24,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const section4StartY = ensurePageSpace((doc.lastAutoTable?.finalY || section3StartY + 120) + 40, 140);
    doc.setFontSize(18);
    doc.text("SECTION 4: FULL TRANSACTION HISTORY", 32, section4StartY, { align: "left" });
    doc.setFontSize(12);
    doc.text("(ALL activity: strategy trades + self-directed trades + cash movements)", 32, section4StartY + 18, {
      align: "left",
    });

    autoTable(doc, {
      head: [[
        "Date",
        "Transaction Type",
        "Strategy / Source",
        "Instrument",
        "Buy / Sell",
        "Quantity",
        "Price",
        "Gross Amount",
        "Fees",
        "Net Amount",
      ]],
      body: [
        ["dd/mm/yyyy", "Strategy Trade", "MINT SA Defensive Income", "SBK", "Buy", "xxx", "xx.xx", "xx,xxx.xx", "xxx.xx", "xx,xxx.xx"],
        ["dd/mm/yyyy", "Self Trade", "Client Initiated", "VOD", "Sell", "xxx", "xx.xx", "xx,xxx.xx", "xxx.xx", "xx,xxx.xx"],
        ["dd/mm/yyyy", "Dividend", "Strategy Allocation", "SBK", "–", "–", "–", "x,xxx.xx", "–", "x,xxx.xx"],
        ["dd/mm/yyyy", "Fee", "Platform Fee", "–", "–", "–", "–", "(xxx.xx)", "–", "(xxx.xx)"],
      ],
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      pageBreak: "auto",
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 70 },
        2: { cellWidth: 85 },
        3: { cellWidth: 45 },
        4: { cellWidth: 45 },
        5: { cellWidth: 40, halign: "right" },
        6: { cellWidth: 40, halign: "right" },
        7: { cellWidth: 55, halign: "right" },
        8: { cellWidth: 45, halign: "right" },
        9: { cellWidth: 55, halign: "right" },
      },
      startY: section4StartY + 32,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const section4NotesY = (doc.lastAutoTable?.finalY || section4StartY + 160) + 20;
    doc.setFontSize(12);
    doc.text("Notes:", 32, section4NotesY, { align: "left" });
    const section4Notes = [
      "• Transaction source distinguishes between strategy-driven activity and client-initiated trades.",
      "• All fees are disclosed on a gross and net basis.",
    ];
    doc.text(section4Notes, 32, section4NotesY + 16, {
      align: "left",
      maxWidth: 530,
    });

    const section5StartY = ensurePageSpace(section4NotesY + 70, 120);
    doc.setFontSize(18);
    doc.text("SECTION 5: FEES & CHARGES SUMMARY", 32, section5StartY, { align: "left" });

    autoTable(doc, {
      head: [["Fee Type", "Amount (ZAR)"]],
      body: [
        ["Platform Fees", "x,xxx.xx"],
        ["Strategy Fees", "x,xxx.xx"],
        ["Brokerage & Execution", "xxx.xx"],
        ["Custody Fees", "xxx.xx"],
        ["Total Fees", "x,xxx.xx"],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 300 },
        1: { cellWidth: 200, halign: "right" },
      },
      startY: section5StartY + 24,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const disclosuresStartY = ensurePageSpace((doc.lastAutoTable?.finalY || section5StartY + 120) + 40, 220);
    doc.setFontSize(16);
    doc.text("IMPORTANT DISCLOSURES & DISCLAIMERS", 32, disclosuresStartY, { align: "left" });
    doc.setFontSize(11);
    const disclosuresText = [
      "This statement is issued by MINT and is provided for information purposes only. It does not constitute investment advice, a recommendation, or an offer to buy or sell any financial instrument.",
      "MINT operates as a regulated financial services platform. Certain representatives and portfolio management functions may operate under supervision in accordance with the Financial Advisory and Intermediary Services Act, 2002 (FAIS). Where applicable, supervised representatives act under the oversight of approved key individuals and management structures.",
      "Client assets are held in custody with an approved third-party custodian, currently [Bank X], and are segregated from MINT's own assets in accordance with applicable regulatory and custodial requirements. MINT does not commingle client funds with its own operating accounts.",
      "Investment strategies available on the platform are model-based and discretionary in nature. Strategy allocations, holdings, and rebalancing decisions are implemented in accordance with predefined investment mandates but may be adjusted from time to time based on market conditions, risk considerations, liquidity constraints, or operational requirements. Strategies may hold cash temporarily as part of portfolio construction, rebalancing processes, defensive positioning, or pending deployment. Cash balances reflected in this statement may therefore relate to both unallocated funds and strategy-level cash positions.",
      "Rebalancing is performed at intervals determined by the investment team and may not occur simultaneously across all client accounts. As a result, timing differences, cash drag, and execution variances may occur between accounts following the same strategy.",
      "Performance figures shown include both realised and unrealised gains and losses and are based on valuations available as at the statement date. Past performance is not indicative of future results. Market values may fluctuate and capital invested is not guaranteed.",
      "Transaction records include both strategy-driven trades and client-initiated self-directed trades. MINT does not warrant the completeness or accuracy of third-party market data and pricing sources used in compiling this statement.",
      "Tax treatment depends on individual circumstances and may change. Clients are responsible for obtaining independent tax advice.",
      "This statement should be read in conjunction with the platform terms and conditions, strategy disclosures, and risk warnings available on the MINT platform.",
    ];
    let disclosuresY = disclosuresStartY + 18;
    disclosuresText.forEach((paragraph) => {
      const lines = doc.splitTextToSize(paragraph, 530);
      const blockHeight = lines.length * 14;
      disclosuresY = ensurePageSpace(disclosuresY, blockHeight + 10);
      doc.text(lines, 32, disclosuresY, { align: "left" });
      disclosuresY += blockHeight + 8;
    });

    doc.save("statements.pdf");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-10 pt-8 text-white">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName || "Profile"}
                  className="h-10 w-10 rounded-full border border-white/40 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-700">
                  {initials || "—"}
                </div>
              )}
            </div>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">Statements</h1>
            <NotificationBell onClick={onOpenNotifications} />
          </header>
          <div className="flex w-full items-center justify-center">
            <div className="w-full max-w-md">
              <div className="grid w-full grid-cols-3 rounded-full bg-white/10 p-1 backdrop-blur-md">
                {[
                  { id: "strategy", label: "Strategy" },
                  { id: "holdings", label: "Individual Stocks" },
                  { id: "financials", label: "Financials" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      activeTab === tab.id
                        ? "w-full rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
                        : "w-full rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid w-full grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/70 shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="col-span-1 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-6 w-full max-w-md px-4 pb-16">
        <div className="rounded-2xl bg-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Recent items</p>
            <p className="text-xs text-slate-400">Showing {pageRows.length} of {searchFiltered.length}</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-400">Loading...</p>
            </div>
          ) : pageRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-slate-400">No data available</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {pageRows.map((row, idx) => {
                const holdingStatus = row.status;
                const isHoldingsTab = activeTab === "holdings";
                const isIncoming = row.flow === "in";
                const indicator = isHoldingsTab
                  ? holdingStatus === "Liquidated"
                    ? { icon: <ArrowDownRight className="h-3.5 w-3.5" />, color: "text-rose-500" }
                    : holdingStatus === "Filled"
                      ? { icon: <ArrowUpRight className="h-3.5 w-3.5" />, color: "text-emerald-600" }
                      : { icon: "—", color: "text-slate-400" }
                  : isIncoming
                    ? { icon: <ArrowUpRight className="h-3.5 w-3.5" />, color: "text-emerald-600" }
                    : { icon: <ArrowDownRight className="h-3.5 w-3.5" />, color: "text-rose-500" };
                return (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-xl bg-white px-3 py-2.5 transition-all hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      {activeTab === "holdings" ? (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                          {row.logoUrl ? (
                            <img
                              src={row.logoUrl}
                              alt={row.title}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="text-lg text-slate-500">—</span>
                          )}
                        </div>
                      ) : (
                        <div className="h-9 w-9 flex-shrink-0" />
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[13px] leading-tight text-slate-900">{row.title}</h3>
                        <p className="text-[11px] leading-tight text-slate-500">{row.desc}</p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center justify-end gap-1 text-sm text-slate-900">
                          <span className={indicator.color}>{indicator.icon}</span>
                          <span>{row.amount}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {row.date} · {row.time}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedCard(row)}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              className={`rounded px-3 py-2 ${page === 1 ? "cursor-not-allowed opacity-40" : "bg-slate-100 hover:bg-slate-200"}`}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              ‹
            </button>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`rounded px-3 py-2 ${
                  page === i + 1 ? "bg-violet-600 text-white" : "bg-transparent text-slate-600 hover:bg-slate-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              className={`rounded px-3 py-2 ${page === pages ? "cursor-not-allowed opacity-40" : "bg-slate-100 hover:bg-slate-200"}`}
              onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
              disabled={page === pages}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close modal"
            onClick={() => setSelectedCard(null)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Statement Details</h2>
                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-6">
                {activeTab === "holdings" && (
                  <div className="flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                      {selectedCard.logoUrl ? (
                        <img
                          src={selectedCard.logoUrl}
                          alt={selectedCard.title}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-3xl text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                )}

                {selectedCard.type === "Holdings" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Instrument</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.instrument}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Ticker</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.ticker}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Quantity</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.quantity}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Avg Cost</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.avgCost}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Market Price</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.marketPrice}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Market Value</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.marketValue}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="mb-1 text-xs uppercase text-slate-400">Unrealised P/L</p>
                      <p className="text-sm font-medium text-slate-900">{selectedCard.unrealizedPL}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="mb-2 text-xs uppercase text-slate-400">Strategy</p>
                      <div className="space-y-3 text-sm text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Strategy Name</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.strategyName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Allocation (%)</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.allocation}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Capital Invested</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.capitalInvested}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Current Value</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.currentValue}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Unrealised P/L</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.unrealisedPL}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Realised P/L</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.realisedPL}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Total P/L</span>
                          <span className="font-semibold text-slate-900">{strategyDetails?.totalPL}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementsPage;
