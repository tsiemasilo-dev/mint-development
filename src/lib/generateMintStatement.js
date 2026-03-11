import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);

// ─── drawMintLogo — pure jsPDF vector logo (no addImage required) ────────────
// Draws chevrons + "MINT" text using only jsPDF primitives.
// x, y = top-left; h = height in mm; col = RGB array
function drawMintLogo(doc, x, y, h, col = [255, 255, 255]) {
  const cw = h * 0.73;
  doc.setFillColor(...col);
  // Upper chevron
  doc.triangle(x, y, x + cw * 0.6, y, x + cw, y + h * 0.38, "F");
  doc.triangle(x, y, x + cw, y + h * 0.38, x, y + h * 0.22, "F");
  doc.triangle(x, y + h * 0.22, x + cw, y + h * 0.38, x + cw * 0.6, y + h * 0.38, "F");
  doc.rect(x, y, cw * 0.6, h * 0.22, "F");
  // Lower chevron
  doc.triangle(x + cw, y + h * 0.62, x, y + h, x + cw * 0.4, y + h * 0.62, "F");
  doc.triangle(x + cw, y + h * 0.62, x + cw, y + h * 0.78, x, y + h, "F");
  doc.triangle(x + cw, y + h * 0.78, x + cw * 0.4, y + h * 0.78, x, y + h, "F");
  doc.rect(x + cw * 0.4, y + h * 0.62, cw * 0.6, h * 0.38, "F");
  // Wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(h * 2.9);
  doc.setTextColor(...col);
  doc.text("MINT", x + cw + h * 0.18, y + h * 0.76);
  doc.setFontSize(10);
}

const LOGO_ASPECT = 2.283;

// ─── Palette (matches factsheet exactly) ─────────────────────────────────────
const P        = [59,  27,  122];
const P_MID    = [91,  33,  182];
const P_DIM    = [130, 95,  210];
const P_LITE   = [237, 233, 254];
const P_PALE   = [246, 244, 255];
const P_STRIPE = [228, 222, 250];
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

// ─── Legal tagline constant ───────────────────────────────────────────────────
const LEGAL_TAGLINE =
  "MINT (Pty) Ltd · Authorised FSP 55118 · Regulated by the FSCA · Registered Credit Provider NCRCP22892 · © 2026 MINT. All rights reserved.";

// ─── Number helpers ───────────────────────────────────────────────────────────
const parseAmount = (str) => {
  if (!str) return 0;
  const s        = String(str).trim();
  const negative = s.startsWith("-") || s.startsWith("\u2212");
  const cleaned  = s.replace(/[^0-9.]/g, "");
  const v        = parseFloat(cleaned);
  return isNaN(v) ? 0 : negative ? -v : v;
};

const fmtR = (v) => {
  if (v == null || isNaN(+v)) return "—";
  const n = +v, abs = Math.abs(n);
  let s;
  if (abs >= 1e9)      s = `R ${(abs / 1e9).toFixed(2)}bn`;
  else if (abs >= 1e6) s = `R ${(abs / 1e6).toFixed(2)}m`;
  else                 s = `R ${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n < 0 ? `-${s}` : s;
};

const fmtPct = (v) => {
  if (v == null || !isFinite(+v)) return "—";
  const n = +v;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

const getMintAccountNumber = (profile) =>
  profile?.mintNumber ||
  profile?.accountNumber ||
  (profile?.id ? `MINT-${String(profile.id).slice(0, 8).toUpperCase()}` : "MINT-XXXXXXXX");

// ─── Section pill heading ─────────────────────────────────────────────────────
function secHead(doc, num, label, y) {
  const PILL_H = 7;
  fc(doc, P);
  doc.rect(ML, y, CW, PILL_H, "F");
  fc(doc, P_MID);
  doc.rect(ML, y, 2.5, PILL_H, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); tc(doc, [185, 155, 230]);
  doc.text(`${num}.`, ML + 5, y + 4.9);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); tc(doc, WHITE);
  doc.text(label.toUpperCase(), ML + 13, y + 4.9);
  return y + PILL_H + 4;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function kpiCard(doc, label, value, x, y, w, h, valCol = DARK) {
  fc(doc, P_LITE);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  fc(doc, P_MID);
  doc.rect(x, y, w, 1.5, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.2); tc(doc, P_DIM);
  doc.text(label.toUpperCase(), x + 3, y + 6.2);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); tc(doc, valCol);
  const maxW = w - 6;
  let fs = 8;
  while (doc.getTextWidth(String(value)) > maxW && fs > 5) { fs -= 0.5; doc.setFontSize(fs); }
  doc.text(String(value), x + 3, y + 13.5);
}

// ─── Carry header (pages 2+) ──────────────────────────────────────────────────
function carryHeader(doc, clientName, accountNo, pageNum, totalPages) {
  const LOGO_H = 5, LOGO_W = LOGO_H * LOGO_ASPECT;

  fc(doc, P);     doc.rect(0, 0, PW, 13, "F");
  fc(doc, P_MID); doc.rect(0, 0, PW, 1.5, "F");

  // Logo left
  drawMintLogo(doc, ML, (13 - LOGO_H) / 2, LOGO_H);

  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [185, 155, 230]);
  doc.text(`${clientName}  ·  ${accountNo}`, PW / 2, 8.5, { align: "center" });
  tc(doc, [160, 130, 210]);
  const pgLabel = totalPages ? `Page ${pageNum} of ${totalPages}` : `Page ${pageNum}`;
  doc.text(pgLabel, PW - MR, 8.5, { align: "right" });
}

// ─── Page footer ─────────────────────────────────────────────────────────────
function pageFooter(doc, accountNo, isoDate, pageNum, totalPages) {
  const FY     = PH - 12;
  const LOGO_H = 4.5, LOGO_W = LOGO_H * LOGO_ASPECT;

  fc(doc, P);     doc.rect(0, FY, PW, 12, "F");
  fc(doc, P_MID); doc.rect(0, FY, PW, 1,  "F");

  // Logo in footer
  drawMintLogo(doc, ML, FY + 2.5, LOGO_H);

  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [185, 160, 225]);
  doc.text(`Investment Statement  ·  ${accountNo}`, ML + LOGO_W + 4, FY + 5.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5); tc(doc, [160, 130, 205]);
  doc.text(LEGAL_TAGLINE, ML, FY + 9.5, { maxWidth: PW - ML - MR - 30 });

  tc(doc, [160, 140, 200]);
  doc.text(`Page ${pageNum} of ${totalPages}`, PW - MR, FY + 5,   { align: "right" });
  doc.text(`Generated ${isoDate}`,             PW - MR, FY + 9.5, { align: "right" });
}

// ─── Safe-page guard ─────────────────────────────────────────────────────────
const FOOTER_SAFE = 20;
function guard(doc, y, need, clientName, accountNo) {
  if (y + need > PH - FOOTER_SAFE) {
    doc.addPage();
    const p = doc.internal.getNumberOfPages();
    carryHeader(doc, clientName, accountNo, p, null);
    return 18;
  }
  return y;
}

// ─── autotable didDrawPage callback ──────────────────────────────────────────
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
// preOpenedWindow: caller must do `const w = window.open("", "_blank")` BEFORE
// awaiting this function so mobile browsers don't block the popup.
export const generateMintStatement = async (
  profile,
  displayName,
  holdingsRows     = [],
  strategyRows     = [],
  activityItems    = [],
  dateFrom         = null,
  dateTo           = null,
  preOpenedWindow  = null,
) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

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

  const holdingsForPdf = (holdingsRows || []).filter(r => r.type === "Holdings");
  const strategyForPdf = strategyRows  || [];
  const txForPdf       = activityItems || [];

  const totalValue = holdingsForPdf.reduce((s, r) => s + parseAmount(r.marketValue),  0);
  const totalPL    = holdingsForPdf.reduce((s, r) => s + parseAmount(r.unrealizedPL), 0);

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE 1 HEADER BAND
  // ═══════════════════════════════════════════════════════════════════════════
  const HDR_H = 42;
  fc(doc, P);     doc.rect(0, 0,     PW, HDR_H, "F");
  fc(doc, P_MID); doc.rect(0, 0,     PW, 1.8,   "F");
  fc(doc, P_MID); doc.rect(0, HDR_H, PW, 0.6,   "F");

  // SVG logo — right-aligned in header
  const HDR_LOGO_H = 8, HDR_LOGO_W = HDR_LOGO_H * LOGO_ASPECT;
  drawMintLogo(doc, PW - MR - HDR_LOGO_W, (HDR_H - HDR_LOGO_H) / 2, HDR_LOGO_H);

  // Title block
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); tc(doc, WHITE);
  doc.text("MINT INVESTMENT STATEMENT", ML, 13);
  hl(doc, ML, 16, ML + 90, [120, 90, 180], 0.25);

  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [160, 130, 210]);
  doc.text(`Period: ${fromStr}  –  ${toStr}  ·  Generated: ${genStr}`, ML, 21);
  doc.text("Currency: ZAR  ·  Platform: MINT", ML, 25.5);

  // Legal tagline in header
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5); tc(doc, [185, 155, 230]);
  doc.text(LEGAL_TAGLINE, ML, 31, { maxWidth: PW - MR - HDR_LOGO_W - ML - 4 });

  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [160, 130, 210]);
  doc.text(`${clientName}  ·  ${accountNo}`, ML, 38);

  // ═══════════════════════════════════════════════════════════════════════════
  //  CLIENT / STATEMENT INFO CARD
  // ═══════════════════════════════════════════════════════════════════════════
  let y = HDR_H + 5;

  const CARD_H = 26;
  fc(doc, P_PALE);
  doc.roundedRect(ML, y, CW, CARD_H, 2, 2, "F");
  dc(doc, DIV); doc.setLineWidth(0.25);
  doc.roundedRect(ML, y, CW, CARD_H, 2, 2, "S");

  const HALF = (CW - 4) / 2;
  const RX2  = ML + HALF + 4;

  fc(doc, P_LITE);
  doc.roundedRect(ML + 2, y + 2, HALF, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(5.8); tc(doc, P_MID);
  doc.text("CLIENT DETAILS", ML + 4, y + 5.8);

  dc(doc, DIV); doc.setLineWidth(0.2);
  doc.line(ML + HALF + 2, y + 2, ML + HALF + 2, y + CARD_H - 2);

  fc(doc, P_LITE);
  doc.roundedRect(RX2, y + 2, HALF, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(5.8); tc(doc, P_MID);
  doc.text("STATEMENT INFO", RX2 + 2, y + 5.8);

  const truncate = (s, n) => String(s || "—").length > n ? String(s).slice(0, n) + "…" : String(s || "—");

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
  y = guard(doc, y, 34, clientName, accountNo);
  y = secHead(doc, "1", "Portfolio Summary", y);

  const KPI_COUNT = 5, KPI_GAP = 3;
  const KPI_W = (CW - KPI_GAP * (KPI_COUNT - 1)) / KPI_COUNT;
  const KPI_H = 17;

  const kpis = [
    { label: "Total Market Value",    value: fmtR(totalValue),             col: DARK                       },
    { label: "Total Unrealised P/L",  value: fmtR(totalPL),                col: totalPL >= 0 ? GREEN : RED },
    { label: "Holdings",              value: String(holdingsForPdf.length), col: DARK                       },
    { label: "Active Strategies",     value: String(strategyForPdf.length), col: DARK                       },
    { label: "Transactions (Period)", value: String(txForPdf.length),       col: DARK                       },
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
    doc.autoTable({
      startY: y, margin: { left: ML, right: MR }, tableWidth: CW,
      head: [["Strategy", "Risk Level", "Current Value", "Day Chg", "1W", "1M", "3M", "YTD"]],
      body: strategyForPdf.map(s => [
        s.fullName  || s.title || "—",
        s.riskLevel || "—",
        s.amount    || "—",
        fmtPct(s.changePct),
        fmtPct(s.r1w), fmtPct(s.r1m), fmtPct(s.r3m), fmtPct(s.rytd),
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
        7: { halign: "right" },
      },
      didParseCell: (d) => {
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
    doc.autoTable({
      startY: y, margin: { left: ML, right: MR }, tableWidth: CW,
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
        6: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: (d) => {
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

    const totalsY = doc.lastAutoTable.finalY;
    const TOTALS_H = 6.5;
    fc(doc, P_STRIPE);
    doc.rect(ML, totalsY, CW, TOTALS_H, "F");
    dc(doc, P_MID); doc.setLineWidth(0.3);
    doc.line(ML, totalsY,            ML + CW, totalsY);
    doc.line(ML, totalsY + TOTALS_H, ML + CW, totalsY + TOTALS_H);

    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, P);
    doc.text("PORTFOLIO TOTAL", ML + 3, totalsY + 4.4);
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, DARK);
    doc.text(fmtR(totalValue), ML + 152 - 2, totalsY + 4.4, { align: "right" });
    const unrStr = (totalPL >= 0 ? "+" : "") + fmtR(Math.abs(totalPL));
    tc(doc, totalPL >= 0 ? GREEN : RED);
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
    doc.autoTable({
      startY: y, margin: { left: ML, right: MR }, tableWidth: CW,
      head: [["Date", "Description", "Category", "Type", "Status", "Amount"]],
      body: txForPdf.map(t => [
        t.displayDate || t.date || "—",
        t.title       || t.description || "—",
        t.filterCategory || "—",
        t.direction === "credit" ? "IN" : "OUT",
        (() => {
          if (!t.status) return "—";
          if (["successful", "completed", "posted"].includes(t.status)) return "Completed";
          if (t.status === "pending") return "Pending";
          if (t.status === "failed")  return "Failed";
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
        5: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: (d) => {
        if (d.section !== "body") return;
        if (d.column.index === 3) {
          d.cell.styles.textColor = d.cell.text[0] === "IN" ? GREEN : RED;
          d.cell.styles.fontStyle = "bold";
        }
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
  //  SECTION 5 — FULL DISCLOSURES (matches factsheet page 2)
  // ═══════════════════════════════════════════════════════════════════════════
  y = guard(doc, y, 22, clientName, accountNo);
  y = secHead(doc, "5", "Important Disclosures, Risk Factors & Legal Notice", y);

  const COL_W       = (CW - 6) / 2;
  const COL2_X      = ML + COL_W + 6;
  const LINE_H      = 2.9;
  const SECTION_GAP = 5.5;

  const discSections = [
    { title: "Investment Strategy Provider", isDiamond: false,
      body: "Mint Platforms (Pty) Ltd (Reg. 2024/644796/07) trading as MINT, 3 Gwen Lane, Sandown, Sandton, provides investment strategy design and portfolio management services through managed investment strategies. Strategies on the MINT platform are not collective investment schemes or pooled funds unless explicitly stated. This document does not constitute financial advice as defined under FAIS Act No. 37 of 2002 and is provided for informational purposes only. Investors should seek independent financial advice prior to investing." },
    { title: "Custody & Asset Safekeeping", isDiamond: false,
      body: "Client assets are held in custody through Computershare Investor Services (Pty) Ltd (CSDP), via its nominee Computershare Nominees (Pty) Ltd (Reg. 1999/008543/07), Rosebank Towers, 15 Biermann Avenue, Rosebank, Johannesburg. Client assets remain fully segregated from MINT's own operating assets at all times." },
    { title: "Nature of Investment Strategies", isDiamond: false,
      body: "Investment strategies are actively managed portfolios where Mint may rebalance, adjust or change portfolio allocations in accordance with the stated strategy mandate. Rebalancing may occur at any time in response to strategic reallocation, tactical positioning, risk management adjustments, or optimisation of portfolio exposures." },
    { title: "Performance Disclosure", isDiamond: false,
      body: "Performance information may include historical realised performance and back-tested or simulated results. Back-tested performance is hypothetical, constructed with hindsight, and does not represent actual trading results. Past performance, whether actual or simulated, is not a reliable indicator of future performance. Performance shown is gross of fees unless stated. Individual investor returns may differ based on timing, deposits, withdrawals, costs, and applicable taxes." },
    { title: "Fees & Charges", isDiamond: false,
      body: "Performance fee: 20% of investment profits. No management or AUM-based fee is charged. Transaction fee: 0.25% per trade executed within the portfolio. Custody and administrative fees are charged per ISIN and displayed transparently at checkout prior to investment confirmation. A full schedule of fees is available on request from Mint." },
    { title: "Investment Risk Disclosure", isDiamond: false,
      body: "The value of investments may increase or decrease and investors may lose part or all of their invested capital. Strategies are subject to: Market Risk, Equity Risk, Volatility Risk, Derivative Risk, Leverage Risk, Liquidity Risk, Counterparty Risk, Concentration Risk, Correlation Risk, Foreign Market Risk, Strategy Risk, Rebalancing Risk, and Model & Back-Test Risk." },
    { title: "Market & Equity Risk", isDiamond: true,
      body: "Investment strategies are exposed to general market movements. Share prices may fluctuate due to company-specific factors, earnings performance, competitive pressures, or broader macroeconomic and sector conditions. Equity investments may experience periods of significant volatility." },
    { title: "Liquidity & Concentration Risk", isDiamond: true,
      body: "Liquidity risk arises when securities cannot be bought or sold quickly enough to prevent or minimise losses. Concentration risk arises from holding large positions in specific securities, sectors, or regions, increasing sensitivity to adverse events affecting those positions." },
    { title: "Leverage & Counterparty Risk", isDiamond: true,
      body: "Where leverage is employed, adverse market movements may result in amplified losses. Counterparty risk refers to the risk that a financial institution or trading counterparty may fail to fulfil its contractual obligations in relation to derivative contracts, settlement arrangements, or other financial transactions." },
    { title: "Model, Back-Test & Strategy Risk", isDiamond: true,
      body: "Strategies relying on quantitative models or back-tested simulations present inherent limitations. Actual investment outcomes may differ materially from simulated results. There is no assurance that a strategy will achieve its intended objective. Rebalancing may result in transaction costs and may not always produce favourable outcomes." },
    { title: "Liquidity & Withdrawal Considerations", isDiamond: true,
      body: "Investments are subject to market liquidity. Where large withdrawals occur or where underlying market liquidity is constrained, withdrawal requests may be processed over time to ensure orderly portfolio management and investor protection." },
    { title: "Conflicts of Interest", isDiamond: true,
      body: "Mint is committed to fair treatment of all investors. No investor will receive preferential fee or liquidity terms within the same investment strategy unless explicitly disclosed. Where commissions or incentives are payable to third parties, such arrangements will be disclosed in accordance with applicable regulatory requirements." },
  ];

  // ── Measure both columns to find how much space we need ──────────────────
  const leftSecs  = discSections.filter((_, i) => i % 2 === 0);
  const rightSecs = discSections.filter((_, i) => i % 2 === 1);

  const measureCol = (secs, colW) => secs.reduce((total, sec) => {
    doc.setFontSize(5.8);
    const lines = doc.splitTextToSize(sec.body, colW - 2);
    return total + 6.5 + 3 + lines.length * LINE_H + SECTION_GAP;
  }, 0);

  const leftColH  = measureCol(leftSecs,  COL_W);
  const rightColH = measureCol(rightSecs, COL_W);
  const discColH  = Math.max(leftColH, rightColH);

  // If it won't fit on this page, start a new one
  y = guard(doc, y, discColH + 10, clientName, accountNo);

  function renderDiscCol(secs, colX, colW, startY) {
    let cy = startY;
    secs.forEach(sec => {
      const headerBg = sec.isDiamond ? [232, 226, 252] : P;
      const headerTc = sec.isDiamond ? P               : WHITE;
      const dotCol   = sec.isDiamond ? P_MID           : WHITE;
      const PILL_H   = 6.5;

      fc(doc, headerBg);
      doc.roundedRect(colX, cy, colW, PILL_H, 1, 1, "F");
      fc(doc, dotCol);
      doc.rect(colX + 3, cy + 2.3, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.2); tc(doc, headerTc);
      doc.text(sec.title.toUpperCase(), colX + 6.5, cy + 4.2);
      cy += PILL_H + 3;

      doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); tc(doc, BODY);
      const lines = doc.splitTextToSize(sec.body, colW - 2);
      doc.text(lines, colX + 1, cy);
      cy += lines.length * LINE_H + SECTION_GAP;
    });
    return cy;
  }

  renderDiscCol(leftSecs,  ML,      COL_W, y);
  renderDiscCol(rightSecs, COL2_X,  COL_W, y);
  y += discColH + 6;

  // ── Disclaimer box ──────────────────────────────────────────────────────
  const disclaimerText =
    "This document is confidential and issued for the information of addressees and clients of Mint Platforms (Pty) Ltd only. Subject to copyright; may not be reproduced without prior written permission. Information and opinions are provided for informational purposes only and are not statements of fact. No representation or warranty is made that any strategy will achieve its objectives or generate profits. All investments carry risk; investors may lose part or all of invested capital. This document may include simulated or back-tested results which are hypothetical, constructed with hindsight, and do not represent actual trading. Performance is gross of fees unless stated. Strategies referenced are not collective investment schemes unless explicitly stated. This document does not constitute financial advice, an offer to sell, or a solicitation under FAIS Act No. 37 of 2002. The Manager accepts no liability for direct, indirect or consequential loss arising from use of, or reliance on, this document.";

  doc.setFontSize(5.2);
  const disclaimerLines = doc.splitTextToSize(disclaimerText, CW - 6);
  const disclaimerH     = disclaimerLines.length * 2.4 + 13;

  y = guard(doc, y, disclaimerH + 6, clientName, accountNo);

  fc(doc, [240, 236, 255]);
  doc.roundedRect(ML, y, CW, disclaimerH, 2, 2, "F");
  dc(doc, P_MID); doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, CW, disclaimerH, 2, 2, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, P);
  doc.text("DISCLAIMER & LEGAL NOTICE", ML + 3, y + 5.5);
  hl(doc, ML + 3, y + 7.5, ML + CW - 3, DIV, 0.2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.2); tc(doc, BODY);
  doc.text(disclaimerLines, ML + 3, y + 11);
  y += disclaimerH + 5;

  // ── Contact / additional info box ─────────────────────────────────────────
  y = guard(doc, y, 22, clientName, accountNo);
  fc(doc, P_LITE);
  doc.roundedRect(ML, y, CW, 20, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, P);
  doc.text("ADDITIONAL INFORMATION & CONTACT", ML + 3, y + 5.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); tc(doc, BODY);
  const addLines = doc.splitTextToSize(
    "Additional information regarding Mint's investment strategies — including strategy descriptions, risk disclosures, fee schedules, investment methodology, and portfolio construction framework — is available on request. Contact us: info@mymint.co.za  ·  +27 10 276 0531  ·  www.mymint.co.za  ·  3 Gwen Lane, Sandown, Sandton, Johannesburg.",
    CW - 6
  );
  doc.text(addLines, ML + 3, y + 10);

  // ═══════════════════════════════════════════════════════════════════════════
  //  STAMP FOOTERS + CARRY HEADERS ON ALL PAGES
  // ═══════════════════════════════════════════════════════════════════════════
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    pageFooter(doc, accountNo, isoDate, p, totalPages);
    if (p > 1) carryHeader(doc, clientName, accountNo, p, totalPages);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  OUTPUT — mobile-safe
  //  On mobile, window.open() is blocked if called after an await.
  //  Solution: caller opens a blank window BEFORE awaiting this function,
  //  passes it in as `preOpenedWindow`, and we write the blob URL into it.
  // ═══════════════════════════════════════════════════════════════════════════
  const safeName = clientName.replace(/[^a-zA-Z0-9]/g, "_");
  const safeAcct = accountNo.replace(/[^A-Z0-9\-]/gi, "");
  const filename = `MINT_Statement_${safeName}_${safeAcct}_${isoDate}.pdf`;

  try {
    const blob = doc.output("blob");
    const url  = URL.createObjectURL(blob);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);

    // 1. Use the pre-opened window if the caller provided one (mobile path)
    if (preOpenedWindow && !preOpenedWindow.closed) {
      preOpenedWindow.location.href = url;
      return;
    }

    // 2. Try opening a new tab (works on desktop, blocked on mobile without pre-open)
    const newTab = window.open(url, "_blank");
    if (newTab && !newTab.closed) return;

    // 3. Final fallback: force a download via hidden <a>
    const a = document.createElement("a");
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("[Statement PDF] fallback triggered:", err);
    doc.save(filename);
  }
};
