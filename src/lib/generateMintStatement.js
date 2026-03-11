import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import mintLogo from "../../mint-icon-transparent.png";
applyPlugin(jsPDF);

// ─── Palette (matches factsheet exactly) ─────────────────────────────────────
const P        = [59,  27,  122];   // deep brand purple
const P_MID    = [91,  33,  182];   // mid purple
const P_DIM    = [130, 95,  210];   // muted purple
const P_LITE   = [237, 233, 254];   // pale lavender
const P_PALE   = [246, 244, 255];   // near-white lavender rows
const P_STRIPE = [228, 222, 250];   // alternating / totals rows
const WHITE    = [255, 255, 255];
const DARK     = [18,  21,  38 ];
const BODY     = [50,  35,  90 ];
const DIV      = [210, 200, 240];
const GREEN    = [22,  163, 74 ];
const RED      = [220, 38,  38 ];
const AMBER    = [217, 119, 6  ];

// ─── Page geometry (mm) ───────────────────────────────────────────────────────
const PW = 210;
const PH = 297;
const ML = 14;
const MR = 14;
const CW = PW - ML - MR;  // 182 mm usable width

// ─── Colour helpers ───────────────────────────────────────────────────────────
const tc = (doc, c) => doc.setTextColor(...c);
const fc = (doc, c) => doc.setFillColor(...c);
const dc = (doc, c) => doc.setDrawColor(...c);

function hl(doc, x1, y, x2, col = DIV, lw = 0.18) {
  dc(doc, col); doc.setLineWidth(lw); doc.line(x1, y, x2, y);
}

// ─── Number helpers ───────────────────────────────────────────────────────────

/**
 * Parse a formatted currency / percentage string into a plain number.
 * Handles "R1,234.56", "+R1,234.56", "−R1,234.56", "-R1,234.56", "+12.5%", "—", null.
 * Sign is detected BEFORE stripping so Unicode minus U+2212 is handled correctly.
 */
const parseAmount = (str) => {
  if (!str) return 0;
  const s        = String(str).trim();
  const negative = s.startsWith("-") || s.startsWith("\u2212");
  const cleaned  = s.replace(/[^0-9.]/g, "");
  const v        = parseFloat(cleaned);
  return isNaN(v) ? 0 : negative ? -v : v;
};

/**
 * Format a raw number (ZAR cents or rands) into a readable currency string.
 * Expects VALUE IN RANDS (not cents).
 */
const fmtR = (v) => {
  if (v == null || isNaN(+v)) return "—";
  const n   = +v;
  const abs = Math.abs(n);
  let s;
  if (abs >= 1e9)      s = `R ${(abs / 1e9).toFixed(2)}bn`;
  else if (abs >= 1e6) s = `R ${(abs / 1e6).toFixed(2)}m`;
  else                 s = `R ${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n < 0 ? `-${s}` : s;
};

/** Format a pct value (already in percent terms, e.g. 5.13 → "+5.13%") */
const fmtPct = (v) => {
  if (v == null || !isFinite(+v)) return "—";
  const n = +v;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

// ─── Account number helper ────────────────────────────────────────────────────
const getMintAccountNumber = (profile) =>
  profile?.mintNumber ||
  profile?.accountNumber ||
  (profile?.id ? `MINT-${String(profile.id).slice(0, 8).toUpperCase()}` : "MINT-XXXXXXXX");

// ─── Section pill heading ─────────────────────────────────────────────────────
// Identical style to factsheet: deep purple fill, left accent bar, number + label.
// Returns y positioned 4 mm below the pill bottom (ready for content).
function secHead(doc, num, label, y) {
  const PILL_H = 7;
  fc(doc, P);
  doc.rect(ML, y, CW, PILL_H, "F");
  fc(doc, P_MID);
  doc.rect(ML, y, 2.5, PILL_H, "F");   // left accent bar
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); tc(doc, [185, 155, 230]);
  doc.text(`${num}.`, ML + 5, y + 4.9);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); tc(doc, WHITE);
  doc.text(label.toUpperCase(), ML + 13, y + 4.9);
  return y + PILL_H + 4;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
// Small lavender card with purple top accent, uppercase label and bold value.
function kpiCard(doc, label, value, x, y, w, h, valCol = DARK) {
  fc(doc, P_LITE);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  fc(doc, P_MID);
  doc.rect(x, y, w, 1.5, "F");                               // top accent stripe
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.2); tc(doc, P_DIM);
  doc.text(label.toUpperCase(), x + 3, y + 6.2);
  doc.setFont("helvetica", "bold");   doc.setFontSize(8);   tc(doc, valCol);
  // Fit long values by reducing font size if needed
  const maxW = w - 6;
  let fs = 8;
  while (doc.getTextWidth(String(value)) > maxW && fs > 5) {
    fs -= 0.5;
    doc.setFontSize(fs);
  }
  doc.text(String(value), x + 3, y + 13.5);
}

// ─── Carry header (pages 2+) ──────────────────────────────────────────────────
// Compact purple bar identifying the document on overflow pages.
function carryHeader(doc, clientName, accountNo, pageNum, totalPages) {
  fc(doc, P);     doc.rect(0, 0, PW, 11, "F");
  fc(doc, P_MID); doc.rect(0, 0, PW, 1.5, "F");
  doc.setFont("helvetica", "bold");   doc.setFontSize(7);   tc(doc, WHITE);
  doc.text("MINT", ML, 7.8);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [160, 130, 210]);
  doc.text("Investment Statement", ML + 10, 7.8);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [185, 155, 230]);
  doc.text(`${clientName}  ·  ${accountNo}`, PW / 2, 7.8, { align: "center" });
  tc(doc, [160, 130, 210]);
  const pgLabel = totalPages ? `Page ${pageNum} of ${totalPages}` : `Page ${pageNum}`;
  doc.text(pgLabel, PW - MR, 7.8, { align: "right" });
}

// ─── Page footer ─────────────────────────────────────────────────────────────
// Purple footer band with MINT branding, account number and page info.
function pageFooter(doc, accountNo, isoDate, pageNum, totalPages) {
  const FY = PH - 10;
  fc(doc, P);     doc.rect(0, FY, PW, 10, "F");
  fc(doc, P_MID); doc.rect(0, FY, PW, 1,  "F");
  doc.setFont("helvetica", "bold");   doc.setFontSize(6);   tc(doc, WHITE);
  doc.text("MINT", ML, FY + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5);   tc(doc, [160, 130, 205]);
  doc.text("Regulated Financial Services Platform", ML + 9, FY + 5);
  tc(doc, [185, 155, 230]);
  doc.text(accountNo, PW / 2, FY + 5, { align: "center" });
  tc(doc, [160, 140, 200]);
  doc.text(`Page ${pageNum} of ${totalPages}`, PW - MR, FY + 4,   { align: "right" });
  doc.text(`Generated ${isoDate}`,             PW - MR, FY + 8.2, { align: "right" });
}

// ─── Safe-page guard ─────────────────────────────────────────────────────────
// If `need` mm of content won't fit before the footer safe-zone, adds a new page
// and returns the y cursor reset to just below the carry header.
// NOTE: autotable handles its own pagination internally — this is only for
//       manually drawn elements (section heads, KPI cards, disclosure boxes).
const FOOTER_SAFE = 20;   // mm to reserve above footer

function guard(doc, y, need, clientName, accountNo) {
  if (y + need > PH - FOOTER_SAFE) {
    doc.addPage();
    const p = doc.internal.getNumberOfPages();
    carryHeader(doc, clientName, accountNo, p, null); // totalPages unknown yet
    return 16;  // content starts below the 11 mm carry header + 5 mm gap
  }
  return y;
}

// ─── autotable didDrawPage callback ──────────────────────────────────────────
// Ensures carry header is stamped on every overflow page created by autotable.
function onNewPage(doc, clientName, accountNo) {
  return (data) => {
    if (data.pageNumber > 1) {
      carryHeader(doc, clientName, accountNo, data.pageNumber, null);
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export const generateMintStatement = async (
  profile,
  displayName,
  holdingsRows  = [],
  strategyRows  = [],
  activityItems = [],
  dateFrom      = null,
  dateTo        = null,
) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Derived strings ─────────────────────────────────────────────────────────
  const clientName = displayName || profile?.firstName || "Client";
  const accountNo  = getMintAccountNumber(profile);
  const now        = new Date();
  const isoDate    = now.toISOString().split("T")[0];
  const genStr     = now.toLocaleDateString("en-ZA", { day: "numeric", month: "long",  year: "numeric" });
  const fromStr    = dateFrom
    ? new Date(dateFrom).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  const toStr      = dateTo
    ? new Date(dateTo).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
    : now.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  // ── Data preparation ─────────────────────────────────────────────────────────
  // holdingsRows come from the UI — filter to type === "Holdings" to exclude
  // any stray strategy rows that may have been mixed in.
  const holdingsForPdf = (holdingsRows || []).filter(r => r.type === "Holdings");
  const strategyForPdf = strategyRows  || [];
  const txForPdf       = activityItems || [];

  // Portfolio totals — parseAmount handles "R1,234.56" / "+R…" / "−R…" strings.
  const totalValue = holdingsForPdf.reduce((s, r) => s + parseAmount(r.marketValue),  0);
  const totalPL    = holdingsForPdf.reduce((s, r) => s + parseAmount(r.unrealizedPL), 0);

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE 1 HEADER BAND
  // ═══════════════════════════════════════════════════════════════════════════
  const HDR_H = 40;
  fc(doc, P);     doc.rect(0, 0,     PW, HDR_H, "F");
  fc(doc, P_MID); doc.rect(0, 0,     PW, 1.8,   "F");   // top accent line
  fc(doc, P_MID); doc.rect(0, HDR_H, PW, 0.6,   "F");   // bottom accent line

  // Logo — wrapped in try/catch: if the import fails at runtime the rest still renders.
  const ICON_H = 9, ICON_W = ICON_H * (2000 / 791);
  try {
    doc.addImage(mintLogo, "PNG", PW - MR - ICON_W, (HDR_H - ICON_H) / 2, ICON_W, ICON_H);
  } catch (_) { /* logo unavailable — continue without it */ }

  // Brand wordmark
  doc.setFont("helvetica", "bold");   doc.setFontSize(14);  tc(doc, WHITE);
  doc.text("MINT", ML, 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); tc(doc, [185, 155, 230]);
  doc.text("Money in Transit", ML, 17);
  hl(doc, ML, 19.5, ML + 65, [120, 90, 180], 0.25);

  // Document title + meta
  doc.setFont("helvetica", "bold");   doc.setFontSize(9.5); tc(doc, WHITE);
  doc.text("INVESTMENT STATEMENT", ML, 26);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [160, 130, 210]);
  doc.text(`Period: ${fromStr}  –  ${toStr}  ·  Generated: ${genStr}`, ML, 31);
  doc.text("Currency: ZAR  ·  Platform: MINT", ML, 35.5);

  // ═══════════════════════════════════════════════════════════════════════════
  //  CLIENT / STATEMENT INFO CARD
  // ═══════════════════════════════════════════════════════════════════════════
  let y = HDR_H + 5;

  const CARD_H = 26;
  fc(doc, P_PALE);
  doc.roundedRect(ML, y, CW, CARD_H, 2, 2, "F");
  dc(doc, DIV); doc.setLineWidth(0.25);
  doc.roundedRect(ML, y, CW, CARD_H, 2, 2, "S");

  // Two equal columns separated by a vertical rule
  const HALF = (CW - 4) / 2;
  const RX2  = ML + HALF + 4;

  // ── Left column header pill ──
  fc(doc, P_LITE);
  doc.roundedRect(ML + 2, y + 2, HALF, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(5.8); tc(doc, P_MID);
  doc.text("CLIENT DETAILS", ML + 4, y + 5.8);

  // ── Vertical divider ──
  dc(doc, DIV); doc.setLineWidth(0.2);
  doc.line(ML + HALF + 2, y + 2, ML + HALF + 2, y + CARD_H - 2);

  // ── Right column header pill ──
  fc(doc, P_LITE);
  doc.roundedRect(RX2, y + 2, HALF, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(5.8); tc(doc, P_MID);
  doc.text("STATEMENT INFO", RX2 + 2, y + 5.8);

  // Field data
  const clientFields = [
    ["Name",      clientName],
    ["Client ID", profile?.idNumber || "—"],
    ["Account",   accountNo],
    ["Email",     profile?.email || "—"],
  ];
  const stmtFields = [
    ["Period",    `${fromStr} – ${toStr}`],
    ["Generated", genStr],
    ["Currency",  "ZAR"],
    ["Platform",  "MINT"],
  ];

  const truncate = (s, n) => String(s || "—").length > n ? String(s).slice(0, n) + "…" : String(s || "—");

  clientFields.forEach(([lbl, val], i) => {
    const fy = y + 10 + i * 3.6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); tc(doc, P_DIM);
    doc.text(lbl + ":", ML + 4, fy);
    doc.setFont("helvetica", "bold"); tc(doc, DARK);
    doc.text(truncate(val, 32), ML + 20, fy);
  });

  stmtFields.forEach(([lbl, val], i) => {
    const fy = y + 10 + i * 3.6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); tc(doc, P_DIM);
    doc.text(lbl + ":", RX2 + 2, fy);
    doc.setFont("helvetica", "bold"); tc(doc, DARK);
    doc.text(truncate(val, 32), RX2 + 20, fy);
  });

  y += CARD_H + 6;

  // ═══════════════════════════════════════════════════════════════════════════
  //  SECTION 1 — PORTFOLIO SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  // Need: secHead (7+4=11) + KPI row (17) + gap (6) = 34 mm minimum
  y = guard(doc, y, 34, clientName, accountNo);
  y = secHead(doc, "1", "Portfolio Summary", y);

  // Five KPI cards across the full content width
  const KPI_COUNT = 5;
  const KPI_GAP   = 3;
  const KPI_W     = (CW - KPI_GAP * (KPI_COUNT - 1)) / KPI_COUNT;  // ~33.6 mm each
  const KPI_H     = 17;

  const kpis = [
    { label: "Total Market Value",    value: fmtR(totalValue),             col: DARK                      },
    { label: "Total Unrealised P/L",  value: fmtR(totalPL),                col: totalPL >= 0 ? GREEN : RED },
    { label: "Holdings",              value: String(holdingsForPdf.length), col: DARK                      },
    { label: "Active Strategies",     value: String(strategyForPdf.length), col: DARK                      },
    { label: "Transactions (Period)", value: String(txForPdf.length),       col: DARK                      },
  ];

  kpis.forEach((k, i) => {
    kpiCard(doc, k.label, k.value, ML + i * (KPI_W + KPI_GAP), y, KPI_W, KPI_H, k.col);
  });

  y += KPI_H + 6;

  // ═══════════════════════════════════════════════════════════════════════════
  //  SECTION 2 — STRATEGY ALLOCATION & PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════
  y = guard(doc, y, 22, clientName, accountNo);
  y = secHead(doc, "2", "Strategy Allocation & Performance", y);

  if (!strategyForPdf.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); tc(doc, P_DIM);
    doc.text("No strategies subscribed.", ML + 3, y + 4);
    y += 12;
  } else {
    // Column widths: 44+20+26+18+14+14+14 = 150, last col gets remaining 32 mm
    doc.autoTable({
      startY:     y,
      margin:     { left: ML, right: MR },
      tableWidth: CW,
      head: [["Strategy", "Risk Level", "Current Value", "Day Chg", "1W", "1M", "3M", "YTD"]],
      body: strategyForPdf.map(s => [
        s.fullName  || s.title || "—",
        s.riskLevel || "—",
        s.amount    || "—",
        fmtPct(s.changePct),
        fmtPct(s.r1w),
        fmtPct(s.r1m),
        fmtPct(s.r3m),
        fmtPct(s.rytd),
      ]),
      styles:             { fontSize: 6.2, cellPadding: 2, textColor: DARK, lineColor: DIV, lineWidth: 0.12 },
      headStyles:         { fillColor: P_MID, textColor: WHITE, fontStyle: "bold", fontSize: 6, cellPadding: 2.2 },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 44 },
        1: { cellWidth: 20 },
        2: { halign: "right", cellWidth: 26 },
        3: { halign: "right", cellWidth: 18 },
        4: { halign: "right", cellWidth: 14 },
        5: { halign: "right", cellWidth: 14 },
        6: { halign: "right", cellWidth: 14 },
        7: { halign: "right" },                 // auto width = 32 mm
      },
      didParseCell: (d) => {
        // Colour day/period return columns (indices 3–7) green or red
        if (d.section === "body" && d.column.index >= 3) {
          const t = (d.cell.text[0] || "").trim();
          if (t !== "—") {
            const v = parseFloat(t);
            d.cell.styles.textColor = isNaN(v) ? DARK : v >= 0 ? GREEN : RED;
            d.cell.styles.fontStyle = "bold";
          }
        }
      },
      didDrawPage: onNewPage(doc, clientName, accountNo),
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SECTION 3 — HOLDINGS DETAIL
  // ═══════════════════════════════════════════════════════════════════════════
  y = guard(doc, y, 22, clientName, accountNo);
  y = secHead(doc, "3", "Holdings Detail", y);

  if (!holdingsForPdf.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); tc(doc, P_DIM);
    doc.text("No holdings found.", ML + 3, y + 4);
    y += 12;
  } else {
    // Column widths: 16+46+16+24+24+26 = 152, last col gets remaining 30 mm
    doc.autoTable({
      startY:     y,
      margin:     { left: ML, right: MR },
      tableWidth: CW,
      head: [["Ticker", "Instrument", "Qty", "Avg Cost", "Mkt Price", "Mkt Value", "Unreal. P/L"]],
      body: holdingsForPdf.map(r => [
        r.ticker       || "—",
        r.instrument   || r.title || "—",
        r.quantity     || "—",
        r.avgCost      || "—",
        r.marketPrice  || "—",
        r.marketValue  || "—",
        r.unrealizedPL || "—",
      ]),
      styles:             { fontSize: 6.2, cellPadding: 2, textColor: DARK, lineColor: DIV, lineWidth: 0.12 },
      headStyles:         { fillColor: P_MID, textColor: WHITE, fontStyle: "bold", fontSize: 6, cellPadding: 2.2 },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 16 },
        1: { cellWidth: 46 },
        2: { halign: "right", cellWidth: 16 },
        3: { halign: "right", cellWidth: 24 },
        4: { halign: "right", cellWidth: 24 },
        5: { halign: "right", fontStyle: "bold", cellWidth: 26 },
        6: { halign: "right", fontStyle: "bold" },  // auto width = 30 mm
      },
      didParseCell: (d) => {
        // Colour the Unreal. P/L column (index 6)
        if (d.section === "body" && d.column.index === 6) {
          const raw = (d.cell.text[0] || "").trim();
          if (raw !== "—") {
            const neg = raw.startsWith("-") || raw.startsWith("\u2212");
            const v   = parseAmount(raw);
            d.cell.styles.textColor = neg ? RED : v !== 0 ? GREEN : DARK;
            d.cell.styles.fontStyle = "bold";
          }
        }
      },
      didDrawPage: onNewPage(doc, clientName, accountNo),
    });

    // ── Manual totals row directly below the autotable ──────────────────────
    // We draw this ourselves rather than adding a fake body row so we have full
    // control over styling and the values come from summing parsed numbers.
    const totalsY     = doc.lastAutoTable.finalY;
    const totalMktVal = totalValue;  // already computed above (same data source)
    const totalUnreal = totalPL;     // same

    const TOTALS_H = 6.5;
    fc(doc, P_STRIPE);
    doc.rect(ML, totalsY, CW, TOTALS_H, "F");
    dc(doc, P_MID); doc.setLineWidth(0.3);
    doc.line(ML, totalsY,              ML + CW, totalsY);               // top border
    doc.line(ML, totalsY + TOTALS_H,   ML + CW, totalsY + TOTALS_H);   // bottom border

    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, P);
    doc.text("PORTFOLIO TOTAL", ML + 3, totalsY + 4.4);

    // Mkt Value total — right-aligned under the Mkt Value column
    // Mkt Value right edge = ML + 16+46+16+24+24+26 = ML+152
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, DARK);
    doc.text(fmtR(totalMktVal), ML + 152 - 2, totalsY + 4.4, { align: "right" });

    // Unreal. P/L total — right-aligned under the last column
    // Last col right edge = ML + CW = ML + 182; inner padding ~2 mm
    const unrStr = (totalUnreal >= 0 ? "+" : "") + fmtR(Math.abs(totalUnreal));
    tc(doc, totalUnreal >= 0 ? GREEN : RED);
    doc.text(unrStr, ML + CW - 2, totalsY + 4.4, { align: "right" });

    y = totalsY + TOTALS_H + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SECTION 4 — TRANSACTION HISTORY
  // ═══════════════════════════════════════════════════════════════════════════
  y = guard(doc, y, 22, clientName, accountNo);
  y = secHead(doc, "4", "Transaction History", y);

  if (!txForPdf.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); tc(doc, P_DIM);
    doc.text("No transactions in period.", ML + 3, y + 4);
    y += 12;
  } else {
    // Column widths: 20+52+24+14+22 = 132, last col (Amount) gets remaining 50 mm
    doc.autoTable({
      startY:     y,
      margin:     { left: ML, right: MR },
      tableWidth: CW,
      head: [["Date", "Description", "Category", "Type", "Status", "Amount"]],
      body: txForPdf.map(t => [
        t.displayDate || t.date || "—",
        t.title       || t.description || "—",
        t.filterCategory || "—",
        t.direction === "credit" ? "IN" : "OUT",
        (() => {
          if (!t.status) return "—";
          if (["successful", "completed", "posted"].includes(t.status)) return "Completed";
          if (t.status === "pending")  return "Pending";
          if (t.status === "failed")   return "Failed";
          return t.status.charAt(0).toUpperCase() + t.status.slice(1);
        })(),
        t.amount || "—",
      ]),
      styles:             { fontSize: 6.2, cellPadding: 2, textColor: DARK, lineColor: DIV, lineWidth: 0.12 },
      headStyles:         { fillColor: P_MID, textColor: WHITE, fontStyle: "bold", fontSize: 6, cellPadding: 2.2 },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 52 },
        2: { cellWidth: 24 },
        3: { cellWidth: 14, halign: "center", fontStyle: "bold" },
        4: { cellWidth: 22, halign: "center" },
        5: { halign: "right", fontStyle: "bold" },  // auto width = 50 mm
      },
      didParseCell: (d) => {
        if (d.section !== "body") return;
        // Type column: IN = green, OUT = red
        if (d.column.index === 3) {
          d.cell.styles.textColor = d.cell.text[0] === "IN" ? GREEN : RED;
          d.cell.styles.fontStyle = "bold";
        }
        // Status column: colour-coded
        if (d.column.index === 4) {
          const s = d.cell.text[0];
          d.cell.styles.textColor =
            s === "Completed" ? GREEN  :
            s === "Pending"   ? AMBER  :
            s === "Failed"    ? RED    : DARK;
        }
      },
      didDrawPage: onNewPage(doc, clientName, accountNo),
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DISCLOSURES BOX
  // ═══════════════════════════════════════════════════════════════════════════
  // Pre-calculate height so we can guard correctly before drawing.
  const disclosureParagraphs = [
    "MINT is a regulated financial services platform operating under the Financial Advisory and Intermediary Services Act, 2002 (FAIS). Client assets are held in custody with an approved third-party custodian (Computershare Investor Services (Pty) Ltd) and are fully segregated from MINT's own assets at all times.",
    "Past performance is not indicative of future results. Market values may fluctuate and capital invested is not guaranteed. Strategy returns shown are gross of fees unless stated otherwise. This statement is for informational purposes only and does not constitute investment advice.",
    "Tax treatment depends on individual circumstances. Clients are responsible for obtaining independent tax advice. Mint Platforms (Pty) Ltd, Reg. 2024/644796/07  ·  3 Gwen Ln, Sandown, Sandton, 2031  ·  info@mymint.co.za  ·  +27 10 276 0531",
  ];

  // Measure with setFontSize so splitTextToSize is accurate
  doc.setFontSize(5.5);
  const paraLines = disclosureParagraphs.map(p => doc.splitTextToSize(p, CW - 8));
  const DISC_BODY_H = paraLines.reduce((s, ls) => s + ls.length * 2.6 + 3, 0);
  const DISC_H      = 14 + DISC_BODY_H;   // header area (14) + paragraphs

  y = guard(doc, y, DISC_H + 4, clientName, accountNo);

  fc(doc, P_PALE);
  doc.rect(ML, y, CW, DISC_H, "F");
  fc(doc, P);
  doc.rect(ML, y, CW, 2.5, "F");          // purple top bar
  dc(doc, DIV); doc.setLineWidth(0.2);
  doc.rect(ML, y, CW, DISC_H, "S");       // border stroke

  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, P);
  doc.text("IMPORTANT DISCLOSURES", ML + 3, y + 8);
  hl(doc, ML + 3, y + 9.5, ML + CW - 3, DIV, 0.2);

  let dy = y + 13;
  paraLines.forEach(lines => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, BODY);
    doc.text(lines, ML + 3, dy);
    dy += lines.length * 2.6 + 3;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  STAMP FOOTERS + CARRY HEADERS ON ALL PAGES
  // ═══════════════════════════════════════════════════════════════════════════
  // We do this in a final pass so we know totalPages and can update carry headers.
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    pageFooter(doc, accountNo, isoDate, p, totalPages);
    // Carry header on pages 2+ — drawn AFTER footer so it always sits on top
    if (p > 1) {
      carryHeader(doc, clientName, accountNo, p, totalPages);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  OUTPUT — open in new tab, fall back to download
  // ═══════════════════════════════════════════════════════════════════════════
  const safeName = clientName.replace(/[^a-zA-Z0-9]/g, "_");
  const safeAcct = accountNo.replace(/[^A-Z0-9\-]/gi, "");
  const filename = `MINT_Statement_${safeName}_${safeAcct}_${isoDate}.pdf`;

  try {
    const blob   = doc.output("blob");
    const url    = URL.createObjectURL(blob);
    const newTab = window.open(url, "_blank");
    if (!newTab || newTab.closed || typeof newTab.closed === "undefined") {
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } catch (err) {
    console.error("[Statement PDF] fallback triggered:", err);
    doc.save(filename);
  }
};
