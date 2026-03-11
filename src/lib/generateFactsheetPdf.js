import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);

// ─── drawMintLogo — pure jsPDF vector logo (no addImage / no SVG needed) ─────
// Draws the MINT wordmark + two chevrons using only jsPDF primitives.
// x, y = top-left corner; h = desired height in mm; col = RGB fill colour.
function drawMintLogo(doc, x, y, h, col = [255, 255, 255]) {
  // The full logo is ~2.283 : 1 (wide). We split it: chevrons on the left,
  // wordmark "MINT" text on the right.
  const w = h * 2.283;

  // ── Chevron mark (left ~35% of total width) ──────────────────────────────
  const cw = w * 0.32;   // chevron area width
  const ch = h;

  doc.setFillColor(...col);

  // Upper chevron (pointing right / up-right)
  const u = [
    [x,            y + ch * 0.0],
    [x + cw * 0.6, y + ch * 0.0],
    [x + cw,       y + ch * 0.38],
    [x + cw * 0.6, y + ch * 0.38],
    [x + cw * 0.6, y + ch * 0.22],
    [x,            y + ch * 0.22],
  ];
  doc.triangle(u[0][0], u[0][1], u[1][0], u[1][1], u[2][0], u[2][1], "F");
  doc.triangle(u[0][0], u[0][1], u[2][0], u[2][1], u[5][0], u[5][1], "F");
  doc.triangle(u[5][0], u[5][1], u[2][0], u[2][1], u[3][0], u[3][1], "F");

  // Lower chevron (pointing left / down-left)
  const lo = [
    [x + cw,       y + ch * 0.62],
    [x + cw * 0.4, y + ch * 0.62],
    [x,            y + ch],
    [x + cw * 0.4, y + ch],
    [x + cw * 0.4, y + ch * 0.78],
    [x + cw,       y + ch * 0.78],
  ];
  doc.triangle(lo[0][0], lo[0][1], lo[2][0], lo[2][1], lo[1][0], lo[1][1], "F");
  doc.triangle(lo[0][0], lo[0][1], lo[5][0], lo[5][1], lo[2][0], lo[2][1], "F");
  doc.triangle(lo[5][0], lo[5][1], lo[4][0], lo[4][1], lo[2][0], lo[2][1], "F");

  // ── "MINT" wordmark text ────────────────────────────────────────────────
  const tx = x + cw + h * 0.18;
  const ty = y + h * 0.75;  // baseline ~ 75% down
  doc.setFont("helvetica", "bold");
  const fs = h * 2.9;       // font size proportional to height
  doc.setFontSize(fs);
  doc.setTextColor(...col);
  doc.text("MINT", tx, ty);

  // Reset font
  doc.setFontSize(10);
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const P        = [59,  27,  122];   // #3b1b7a  deep brand purple
const P_MID    = [91,  33,  182];   // #5b21b6
const P_DIM    = [130, 95,  210];   // muted labels
const P_LITE   = [237, 233, 254];   // pale lavender
const P_PALE   = [246, 244, 255];   // near-white lavender rows
const P_STRIPE = [228, 222, 250];   // slightly deeper alternating rows
const P_RULE   = [190, 175, 235];   // hairlines
const WHITE    = [255, 255, 255];
const DARK     = [18,  21,  38 ];
const BODY     = [50,  35,  90 ];
const GREEN    = [22,  163, 74 ];
const RED      = [220, 38,  38 ];
const DIV      = [210, 200, 240];

// ─── Page geometry (mm) ───────────────────────────────────────────────────────
const PW  = 210;
const PH  = 297;
const ML  = 13;
const MR  = 13;
const HDR = 30;
const LW  = 117;
const GAP = 5;
const RX  = ML + LW + GAP;   // 135
const RW  = PW - MR - RX;    // 62

// ─── Helpers ──────────────────────────────────────────────────────────────────
const tc = (doc, c) => doc.setTextColor(...c);
const fc = (doc, c) => doc.setFillColor(...c);
const dc = (doc, c) => doc.setDrawColor(...c);

function hl(doc, x1, y1, x2, y2, col = DIV, w = 0.18) {
  dc(doc, col); doc.setLineWidth(w); doc.line(x1, y1, x2, y2);
}

function fmtPct(v) {
  if (v == null || isNaN(+v)) return "N/A";
  const n = +v * 100;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtR(v) {
  if (v == null || isNaN(+v)) return "N/A";
  const n = +v;
  if (n >= 1e9) return `R ${(n / 1e9).toFixed(2)}bn`;
  if (n >= 1e6) return `R ${(n / 1e6).toFixed(2)}m`;
  return `R ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Section pill heading ─────────────────────────────────────────────────────
function secHead(doc, label, x, y, w) {
  const PILL_H = 6.5;
  fc(doc, P);
  doc.rect(x, y - 4.5, w, PILL_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  tc(doc, WHITE);
  doc.text(label.toUpperCase(), x + 3, y);
  return y + (PILL_H - 4.5) + 4;
}

// ─── Sub-heading for right-column cards ──────────────────────────────────────
function subHead(doc, label, x, y, w) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  tc(doc, P_MID);
  doc.text(label.toUpperCase(), x, y);
  hl(doc, x, y + 1.5, x + w, y + 1.5, DIV, 0.18);
  return y + 5;
}

// ─── Performance line chart ───────────────────────────────────────────────────
function drawChart(doc, data, x, y, w, h) {
  fc(doc, P_LITE);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");

  if (!data || data.length < 2) {
    doc.setFontSize(6); tc(doc, P_DIM);
    doc.text("Chart data unavailable", x + w / 2, y + h / 2 + 1, { align: "center" });
    return;
  }

  const vals  = data.map(p => p.v  ?? p.value ?? 0);
  const dates = data.map(p => p.d  ?? p.date  ?? "");
  const minV  = Math.min(...vals), maxV = Math.max(...vals);
  const rng   = (maxV - minV) || 1, pad = rng * 0.12;
  const yMin  = minV - pad, yMax = maxV + pad, yRng = yMax - yMin;

  const cx = x + 14, cy = y + 5, cw = w - 18, ch = h - 14;

  const STEPS = 4;
  doc.setFontSize(4.8); tc(doc, P_RULE);
  for (let i = 0; i <= STEPS; i++) {
    const v  = yMax - (yRng * i) / STEPS;
    const ly = cy + (ch * i) / STEPS;
    hl(doc, cx, ly, cx + cw, ly, [210, 200, 240], 0.1);
    const lbl = v >= 1000 ? v.toFixed(0) : v >= 100 ? v.toFixed(1) : v.toFixed(2);
    doc.text(lbl, cx - 1, ly + 1.5, { align: "right" });
  }

  const step = Math.max(1, Math.floor((dates.length - 1) / 4));
  doc.setFontSize(4.5); tc(doc, P_DIM);
  for (let i = 0; i < dates.length; i += step) {
    const dx = cx + (cw * i) / (dates.length - 1);
    const d  = new Date(dates[i]);
    if (!isNaN(d))
      doc.text(
        `${d.toLocaleString("en-US", { month: "short" })} ${String(d.getDate()).padStart(2, "0")}`,
        dx, cy + ch + 4, { align: "center" }
      );
  }

  const pts = vals.map((v, i) => ({
    px: cx + (cw * i) / (vals.length - 1),
    py: cy + ch - ((v - yMin) / yRng) * ch,
  }));
  dc(doc, P_MID); doc.setLineWidth(0.5);
  for (let i = 1; i < pts.length; i++)
    doc.line(pts[i-1].px, pts[i-1].py, pts[i].px, pts[i].py);

  if (pts.length) { fc(doc, P); doc.circle(pts[pts.length-1].px, pts[pts.length-1].py, 0.8, "F"); }
}

// ─── pct colour hook for autoTable ───────────────────────────────────────────
function pctHook(d, col) {
  if (d.section === "body" && d.column.index === col) {
    const t = d.cell.text[0] || "";
    d.cell.styles.textColor = t.startsWith("+") ? GREEN : t.startsWith("-") ? RED : DARK;
    d.cell.styles.fontStyle = "bold";
  }
}

// ─── Yahoo Finance live sector fetch (with CORS proxy fallbacks) ─────────────
//
// Strategy:
//   1. Direct Yahoo Finance query1 endpoint
//   2. Direct Yahoo Finance query2 endpoint (different CDN, sometimes unblocked)
//   3. allorigins.win CORS proxy  → wraps the query2 URL
//   4. corsproxy.io CORS proxy    → wraps the query2 URL
//
// Each attempt has a 5 s timeout. On any failure we silently move to the next.
// If all four fail the function returns null and the holding's existing
// sector metadata (h.sector / h.gics_sector / h.industry) is used instead.

const SECTOR_TIMEOUT_MS = 5000;

function _abortSignal() {
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    return AbortSignal.timeout(SECTOR_TIMEOUT_MS);
  }
  // Fallback for environments without AbortSignal.timeout
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), SECTOR_TIMEOUT_MS);
  return ctrl.signal;
}

async function _tryFetch(url, headers = {}) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: _abortSignal() });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function _extractSector(json) {
  // Standard Yahoo Finance quoteSummary shape
  return json?.quoteSummary?.result?.[0]?.summaryProfile?.sector ?? null;
}

async function fetchSectorFromYahoo(ticker) {
  if (!ticker) return null;

  // Bare JSE tickers (no dot) get the .JO exchange suffix for Yahoo Finance
  const yhTicker = ticker.includes(".") ? ticker : `${ticker}.JO`;
  const encodedTicker = encodeURIComponent(yhTicker);
  const YF_PATH  = `/v10/finance/quoteSummary/${encodedTicker}?modules=summaryProfile`;

  // ── Attempt 1: Direct query1 ──────────────────────────────────────────────
  let json = await _tryFetch(`https://query1.finance.yahoo.com${YF_PATH}`);
  if (_extractSector(json)) return _extractSector(json);

  // ── Attempt 2: Direct query2 (different CDN) ──────────────────────────────
  json = await _tryFetch(`https://query2.finance.yahoo.com${YF_PATH}`);
  if (_extractSector(json)) return _extractSector(json);

  // ── Attempt 3: allorigins.win proxy ──────────────────────────────────────
  const targetUrl = encodeURIComponent(`https://query2.finance.yahoo.com${YF_PATH}`);
  json = await _tryFetch(`https://api.allorigins.win/get?url=${targetUrl}`);
  // allorigins wraps the response: { contents: "<json string>" }
  if (json?.contents) {
    try {
      const inner = JSON.parse(json.contents);
      if (_extractSector(inner)) return _extractSector(inner);
    } catch { /* malformed — fall through */ }
  }

  // ── Attempt 4: corsproxy.io proxy ────────────────────────────────────────
  json = await _tryFetch(`https://corsproxy.io/?${targetUrl}`);
  if (_extractSector(json)) return _extractSector(json);

  // All attempts exhausted — caller will use existing metadata fallback
  return null;
}

// ─── Donut / Pie chart drawn with jsPDF polygon primitives ───────────────────
const PIE_COLORS = [
  [91,  33,  182],  // brand purple
  [22,  163, 74 ],  // green
  [234, 88,  12 ],  // orange
  [14,  165, 233],  // sky blue
  [168, 85,  247],  // violet
  [234, 179, 8  ],  // amber
  [236, 72,  153],  // pink
  [20,  184, 166],  // teal
  [99,  102, 241],  // indigo
  [239, 68,  68 ],  // red
];

/**
 * Draw a donut pie chart.
 * @param {jsPDF}  doc    - jsPDF instance
 * @param {Array}  slices - [{ name, pct }]  (pct values already sum to 100)
 * @param {number} cx     - centre X (mm)
 * @param {number} cy     - centre Y (mm)
 * @param {number} r      - outer radius (mm)
 * @returns {number}      - bottom Y of the chart (cy + r + 1)
 */
function drawPieChart(doc, slices, cx, cy, r) {
  if (!slices?.length) return cy + r + 1;

  const total  = slices.reduce((s, sl) => s + sl.pct, 0) || 1;
  const STEPS  = 60;   // polygon segments per full circle — smooth enough at PDF scale
  let   angle  = -Math.PI / 2;  // start at 12 o'clock

  slices.forEach((sl, i) => {
    const sweep = (sl.pct / total) * 2 * Math.PI;
    const col   = PIE_COLORS[i % PIE_COLORS.length];

    // Build polygon points: centre → arc
    const pts = [[cx, cy]];
    for (let s = 0; s <= STEPS; s++) {
      const a = angle + (sweep * s) / STEPS;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }

    fc(doc, col);
    dc(doc, WHITE);
    doc.setLineWidth(0.3);

    // jsPDF lines() draws relative segments; convert absolute pts → relative deltas
    const deltas = pts.slice(1).map((p, j) => [p[0] - pts[j][0], p[1] - pts[j][1]]);
    doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], "FD", true);

    angle += sweep;
  });

  // ── White centre hole (donut) ──────────────────────────────────────────────
  fc(doc, WHITE);
  dc(doc, WHITE);
  doc.setLineWidth(0);
  doc.circle(cx, cy, r * 0.46, "F");

  // ── Legend to the right of the pie ────────────────────────────────────────
  const LEG_X  = cx + r + 5;
  const LEG_SQ = 2.6;
  const LEG_LH = 4.4;
  let   legY   = cy - r + 1;

  slices.forEach((sl, i) => {
    const col = PIE_COLORS[i % PIE_COLORS.length];
    fc(doc, col);
    dc(doc, col);
    doc.rect(LEG_X, legY - LEG_SQ + 0.8, LEG_SQ, LEG_SQ, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    tc(doc, BODY);
    const label = sl.name.length > 17 ? sl.name.slice(0, 16) + "…" : sl.name;
    doc.text(`${label}  ${sl.pct.toFixed(1)}%`, LEG_X + LEG_SQ + 1.8, legY);
    legY += LEG_LH;
  });

  return cy + r + 2;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE 2 — FULL DISCLOSURES
// ═══════════════════════════════════════════════════════════════════════════════
function addDisclosurePage(doc, name, dateStr, monthStr, isoDate) {
  doc.addPage();

  // ── Header band ─────────────────────────────────────────────────────────────
  fc(doc, P);     doc.rect(0, 0, PW, HDR, "F");
  fc(doc, P_MID); doc.rect(0, 0, PW, 1.8, "F");
  fc(doc, P_MID); doc.rect(0, HDR, PW, 0.7, "F");

  const D2_LOGO_H = 8;
  const D2_LOGO_W = D2_LOGO_H * 2.283;
  const D2_LOGO_X = PW - MR - D2_LOGO_W;
  drawMintLogo(doc, D2_LOGO_X, (HDR - D2_LOGO_H) / 2, D2_LOGO_H);

  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); tc(doc, WHITE);
  doc.text("MINT STRATEGY FACTSHEET", ML, 11);
  hl(doc, ML, 14, ML + 80, 14, [120, 90, 180], 0.25);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); tc(doc, WHITE);
  doc.text("Important Disclosures, Risk Factors & Legal Notice", ML, 19);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5); tc(doc, [160, 130, 210]);
  doc.text(`${name.toUpperCase()}  ·  ${dateStr}`, ML, 23.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5); tc(doc, [185, 155, 230]);
  doc.text(
    "MINT (Pty) Ltd · Authorised FSP 55118 · Regulated by the FSCA · Registered Credit Provider NCRCP22892 · © 2026 MINT. All rights reserved.",
    ML, 27.5, { maxWidth: D2_LOGO_X - 4 - ML }
  );

  // ── Page background ─────────────────────────────────────────────────────────
  fc(doc, [252, 250, 255]); doc.rect(0, HDR + 0.7, PW, PH - HDR - 0.7, "F");

  const COL_W       = (PW - ML - MR - 6) / 2;
  const COL2_X      = ML + COL_W + 6;
  const LINE_H      = 2.9;
  const SECTION_GAP = 5.5;

  const sections = [
    { title: "Investment Strategy Provider", isDiamond: false,
      body: "Mint Platforms (Pty) Ltd (Reg. 2024/644796/07) trading as MINT, 3 Gwen Lane, Sandown, Sandton, provides investment strategy design and portfolio management services through managed investment strategies. Strategies on the MINT platform are not collective investment schemes or pooled funds unless explicitly stated. This document does not constitute financial advice as defined under FAIS Act No. 37 of 2002 and is provided for informational purposes only. Investors should seek independent financial advice prior to investing." },
    { title: "Custody & Asset Safekeeping", isDiamond: false,
      body: "Client assets are held in custody through Computershare Investor Services (Pty) Ltd (CSDP), via its nominee Computershare Nominees (Pty) Ltd (Reg. 1999/008543/07), Rosebank Towers, 15 Biermann Avenue, Rosebank, Johannesburg. Client assets remain fully segregated from MINT's own operating assets at all times." },
    { title: "Nature of Investment Strategies", isDiamond: false,
      body: "Investment strategies are actively managed portfolios where Mint may rebalance, adjust or change portfolio allocations in accordance with the stated strategy mandate. Rebalancing may occur at any time in response to strategic reallocation, tactical positioning, risk management adjustments, or optimisation of portfolio exposures. These strategies are designed to align with defined investment objectives and risk parameters." },
    { title: "Performance Disclosure", isDiamond: false,
      body: "Performance information may include historical realised performance and back-tested or simulated results. Back-tested performance is hypothetical, constructed with hindsight, and does not represent actual trading results. It may not reflect real-world liquidity constraints, slippage, or execution costs. Past performance, whether actual or simulated, is not a reliable indicator of future performance. Performance shown is gross of fees unless stated. Individual investor returns may differ based on timing, deposits, withdrawals, costs, and applicable taxes." },
    { title: "Fees & Charges", isDiamond: false,
      body: "Performance fee: 20% of investment profits. No management or AUM-based fee is charged. Transaction fee: 0.25% per trade executed within the portfolio. Custody and administrative fees are charged per ISIN and displayed transparently at checkout prior to investment confirmation. A full schedule of fees is available on request from Mint." },
    { title: "Investment Risk Disclosure", isDiamond: false,
      body: "The value of investments may increase or decrease and investors may lose part or all of their invested capital. Strategies are subject to: Market Risk, Equity Risk, Volatility Risk, Derivative Risk, Leverage Risk, Liquidity Risk, Counterparty Risk, Concentration Risk, Correlation Risk, Foreign Market Risk, Strategy Risk, Rebalancing Risk, and Model & Back-Test Risk. Where strategies include foreign investments, performance may also be affected by foreign exchange movements, political and regulatory risk, and settlement risk." },
    { title: "Market & Equity Risk", isDiamond: true,
      body: "Investment strategies are exposed to general market movements. Share prices may fluctuate due to company-specific factors, earnings performance, competitive pressures, or broader macroeconomic and sector conditions. Equity investments may experience periods of significant volatility." },
    { title: "Liquidity & Concentration Risk", isDiamond: true,
      body: "Liquidity risk arises when securities cannot be bought or sold quickly enough to prevent or minimise losses. In certain market environments, liquidity may deteriorate and trades may execute at prices that differ from expected levels. Concentration risk arises from holding large positions in specific securities, sectors, or regions, increasing sensitivity to adverse events affecting those positions." },
    { title: "Leverage & Counterparty Risk", isDiamond: true,
      body: "Where leverage is employed, adverse market movements may result in amplified losses. Counterparty risk refers to the risk that a financial institution or trading counterparty may fail to fulfil its contractual obligations in relation to derivative contracts, settlement arrangements, or other financial transactions." },
    { title: "Model, Back-Test & Strategy Risk", isDiamond: true,
      body: "Strategies relying on quantitative models or back-tested simulations present inherent limitations as results are constructed using historical data with the benefit of hindsight. Actual investment outcomes may differ materially from simulated results. There is no assurance that a strategy will achieve its intended objective. Rebalancing may result in transaction costs and may not always produce favourable outcomes." },
    { title: "Liquidity & Withdrawal Considerations", isDiamond: true,
      body: "Investments are subject to market liquidity. Where large withdrawals occur or where underlying market liquidity is constrained, withdrawal requests may be processed over time to ensure orderly portfolio management and investor protection." },
    { title: "Conflicts of Interest", isDiamond: true,
      body: "Mint is committed to fair treatment of all investors. No investor will receive preferential fee or liquidity terms within the same investment strategy unless explicitly disclosed. Where commissions or incentives are payable to third parties, such arrangements will be disclosed in accordance with applicable regulatory requirements." },
  ];

  const leftSections  = sections.filter((_, i) => i % 2 === 0);
  const rightSections = sections.filter((_, i) => i % 2 === 1);
  const startY = HDR + 10;

  function renderSectionColumn(secList, colX, colW, startY) {
    let y = startY;
    secList.forEach(sec => {
      const headerBg = sec.isDiamond ? [232, 226, 252] : P;
      const headerTc = sec.isDiamond ? P               : WHITE;
      const dotCol   = sec.isDiamond ? P_MID           : WHITE;

      const PILL_H = 6.5;
      fc(doc, headerBg);
      doc.roundedRect(colX, y, colW, PILL_H, 1, 1, "F");

      fc(doc, dotCol);
      doc.rect(colX + 3, y + 2.3, 1.5, 1.5, "F");

      doc.setFont("helvetica", "bold"); doc.setFontSize(6.2); tc(doc, headerTc);
      doc.text(sec.title.toUpperCase(), colX + 6.5, y + 4.2);

      y += PILL_H + 3;

      doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); tc(doc, BODY);
      const lines = doc.splitTextToSize(sec.body, colW - 2);
      doc.text(lines, colX + 1, y);
      y += lines.length * LINE_H + SECTION_GAP;
    });
    return y;
  }

  const leftEnd  = renderSectionColumn(leftSections,  ML,      COL_W, startY);
  const rightEnd = renderSectionColumn(rightSections, COL2_X,  COL_W, startY);

  // ── Disclaimer box ──────────────────────────────────────────────────────────
  const disclaimerY = Math.max(leftEnd, rightEnd) + 5;
  const disclaimerText =
    "This document is confidential and issued for the information of addressees and clients of Mint Platforms (Pty) Ltd only. Subject to copyright; may not be reproduced without prior written permission. Information and opinions are provided for informational purposes only and are not statements of fact. No representation or warranty is made that any strategy will achieve its objectives or generate profits. All investments carry risk; investors may lose part or all of invested capital. This document may include simulated or back-tested results which are hypothetical, constructed with hindsight, and do not represent actual trading. Performance is gross of fees unless stated. Strategies referenced are not collective investment schemes unless explicitly stated. This document does not constitute financial advice, an offer to sell, or a solicitation under FAIS Act No. 37 of 2002. The Manager accepts no liability for direct, indirect or consequential loss arising from use of, or reliance on, this document. Strategies may be modified or withdrawn at the Manager's discretion without prior notice.";

  const disclaimerLines = doc.splitTextToSize(disclaimerText, PW - ML - MR - 6);
  const disclaimerH     = disclaimerLines.length * 2.4 + 13;

  fc(doc, [240, 236, 255]);
  doc.roundedRect(ML, disclaimerY, PW - ML - MR, disclaimerH, 2, 2, "F");
  dc(doc, P_MID); doc.setLineWidth(0.5);
  doc.roundedRect(ML, disclaimerY, PW - ML - MR, disclaimerH, 2, 2, "S");

  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, P);
  doc.text("DISCLAIMER & LEGAL NOTICE", ML + 3, disclaimerY + 5.5);
  hl(doc, ML + 3, disclaimerY + 7.5, PW - MR - 3, disclaimerY + 7.5, DIV, 0.2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(5.2); tc(doc, BODY);
  doc.text(disclaimerLines, ML + 3, disclaimerY + 11);

  // ── Additional info box ─────────────────────────────────────────────────────
  const addInfoY = disclaimerY + disclaimerH + 5;
  if (addInfoY + 20 < PH - 16) {
    fc(doc, P_LITE);
    doc.roundedRect(ML, addInfoY, PW - ML - MR, 20, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); tc(doc, P);
    doc.text("ADDITIONAL INFORMATION", ML + 3, addInfoY + 5.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); tc(doc, BODY);
    const addLines = doc.splitTextToSize(
      "Additional information regarding Mint's investment strategies — including strategy descriptions, risk disclosures, fee schedules, investment methodology, and portfolio construction framework — is available on request from Mint Platforms (Pty) Ltd. Contact us at: info@mymint.co.za  ·  +27 10 276 0531  ·  www.mymint.co.za  ·  3 Gwen Lane, Sandown, Sandton, Johannesburg.",
      PW - ML - MR - 6
    );
    doc.text(addLines, ML + 3, addInfoY + 10);
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const FY = PH - 12;
  fc(doc, P);     doc.rect(0, FY,   PW, 12,  "F");
  fc(doc, P_MID); doc.rect(0, FY,   PW, 1.2, "F");

  const FL2_H = 4.5;
  const FL2_W = FL2_H * 2.283;
  drawMintLogo(doc, ML, FY + 2.5, FL2_H);

  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [185, 160, 225]);
  doc.text(`${name}  ·  Disclosures & Risk Factors  ·  ${monthStr}`, ML + FL2_W + 4, FY + 5.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5); tc(doc, [160, 130, 205]);
  doc.text(
    "MINT (Pty) Ltd · Authorised FSP 55118 · FSCA Regulated · Registered Credit Provider NCRCP22892 · © 2026 MINT. All rights reserved.",
    ML, FY + 9.5
  );
  tc(doc, [160, 140, 200]);
  doc.text("Page 2 of 2",         PW - MR, FY + 4,   { align: "right" });
  doc.text(`Generated ${isoDate}`, PW - MR, FY + 9.5, { align: "right" });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT  (async — awaits Yahoo Finance sector fetches)
// ═══════════════════════════════════════════════════════════════════════════════
// preOpenedWindow: caller must do `const w = window.open("", "_blank")` BEFORE
// awaiting this function so mobile browsers don't block the popup.
export default async function generateFactsheetPdf({
  strategy,
  analytics,
  holdingsWithMetrics,
  holdingsSecurities,
  userPosition,
  calculatedMinInvestment,
  preOpenedWindow = null,
}) {
  const doc      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const name     = strategy?.name || "Strategy";
  const now      = new Date();
  const dateStr  = now.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const monthStr = now.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const isoDate  = now.toISOString().split("T")[0];

  // ═════════════════════════════════════════════════════════════════════════════
  //  PRE-FETCH — Live sector data from Yahoo Finance for all holdings
  //  Runs in parallel before any PDF drawing begins so the chart is ready.
  // ═════════════════════════════════════════════════════════════════════════════
  const holdings = (holdingsWithMetrics || []).filter(
    h => String(h.symbol || h.ticker || "").toUpperCase() !== "CASH"
  );

  // Build sectorMap: { "Technology": 42.5, "Financials": 18.0, ... }
  const sectorMap = {};

  await Promise.all(
    holdings.map(async h => {
      const ticker = h.symbol || h.ticker || "";
      const wt     = h.weightNorm != null ? h.weightNorm * 100 : (+h.weight || 0);

      // 1. Try Yahoo Finance (live)
      let sector = await fetchSectorFromYahoo(ticker);

      // 2. Fall back to existing holding metadata
      if (!sector) {
        sector = h.sector ?? h.gics_sector ?? h.industry ?? h.asset_class ?? "Other";
      }

      sectorMap[sector] = (sectorMap[sector] || 0) + wt;
    })
  );

  // Normalise to 100 % and keep top 10 by weight
  let sectorSlices = Object.entries(sectorMap)
    .map(([name, pct]) => ({ name, pct: +pct.toFixed(2) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  const sliceTotal = sectorSlices.reduce((s, sl) => s + sl.pct, 0);
  if (sliceTotal > 0) {
    sectorSlices = sectorSlices.map(sl => ({
      ...sl,
      pct: +((sl.pct / sliceTotal) * 100).toFixed(1),
    }));
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //  PAGE 1 — FACTSHEET
  // ═════════════════════════════════════════════════════════════════════════════

  // ── Header ───────────────────────────────────────────────────────────────────
  fc(doc, P);     doc.rect(0, 0, PW, HDR, "F");
  fc(doc, P_MID); doc.rect(0, 0, PW, 1.8, "F");
  fc(doc, P_MID); doc.rect(0, HDR, PW, 0.7, "F");

  // Logo — drawn with pure jsPDF vector (no addImage)
  const LOGO_ASPECT = 2.283;
  const LOGO_H = 8;
  const LOGO_W = LOGO_H * LOGO_ASPECT;
  const LOGO_X = PW - MR - LOGO_W;
  const LOGO_Y = (HDR - LOGO_H) / 2;
  drawMintLogo(doc, LOGO_X, LOGO_Y, LOGO_H);

  // Title block
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); tc(doc, WHITE);
  doc.text("MINT STRATEGY FACTSHEET", ML, 11);
  hl(doc, ML, 14, ML + 80, 14, [120, 90, 180], 0.25);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); tc(doc, WHITE);
  const sn = name.length > 52 ? name.slice(0, 52) + "…" : name;
  doc.text(sn, ML, 19, { maxWidth: LOGO_X - 4 - ML });
  doc.setFont("helvetica", "normal"); doc.setFontSize(5); tc(doc, [160, 130, 210]);
  doc.text(`STRATEGY FACTSHEET  ·  ${dateStr}`, ML, 23.5);
  // Legal tagline
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5); tc(doc, [185, 155, 230]);
  doc.text(
    "MINT (Pty) Ltd · Authorised FSP 55118 · Regulated by the FSCA · Registered Credit Provider NCRCP22892 · © 2026 MINT. All rights reserved.",
    ML, 27.5, { maxWidth: LOGO_X - 4 - ML }
  );

  // ── Content ───────────────────────────────────────────────────────────────────
  let ly = HDR + 6;
  let ry = HDR + 6;

  // ── LEFT COLUMN ───────────────────────────────────────────────────────────────

  ly = secHead(doc, "Investment Objective", ML, ly, LW) + 3;

  const objective  = strategy?.objective || strategy?.description || "Investment objective not available.";
  const hasProfile = !!(strategy?.description && strategy?.objective && strategy.description !== strategy.objective);

  doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); tc(doc, BODY);
  const objLines = doc.splitTextToSize(objective.substring(0, hasProfile ? 200 : 300), LW);
  doc.text(objLines, ML, ly);
  ly += objLines.length * 3.0 + 4;

  if (hasProfile) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.8); tc(doc, P_MID);
    doc.text("Strategy Profile", ML, ly); ly += 4;
    doc.setFont("helvetica", "normal"); tc(doc, BODY);
    const dl = doc.splitTextToSize(strategy.description.substring(0, 250), LW);
    doc.text(dl, ML, ly);
    ly += dl.length * 3.0 + 4;
  }

  ly = secHead(doc, "Cumulative Performance", ML, ly, LW) + 3;

  const curves     = analytics?.curves || {};
  const longestKey = ["YTD","6M","3M","1M","1W"].find(k => Array.isArray(curves[k]) && curves[k].length > 1);
  const CHART_H    = 46;
  drawChart(doc, longestKey ? curves[longestKey] : [], ML, ly, LW, CHART_H);
  ly += CHART_H + 4;

  if (longestKey) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(5.2); tc(doc, P_DIM);
    doc.text(`Showing ${longestKey} performance curve`, ML, ly);
    ly += 5;
  }

  ly = secHead(doc, "Return Analysis", ML, ly, LW) + 2;

  const summary = analytics?.summary || {};
  const ytdVal  = summary.ytd_return ?? analytics?.ytd_return;
  const latestV = analytics?.latest_value != null ? +analytics.latest_value / 100 - 1 : null;

  const retRows = [
    ["7 Days",   curves["1W"]],
    ["30 Days",  curves["1M"]],
    ["90 Days",  curves["3M"]],
    ["6 Months", curves["6M"]],
  ].map(([label, curve]) => {
    if (Array.isArray(curve) && curve.length > 1) {
      const f = curve[0]?.v ?? 0, l = curve[curve.length-1]?.v ?? 0;
      return [label, fmtPct(f ? (l - f) / f : 0)];
    }
    return [label, "N/A"];
  });
  retRows.push(["YTD",      fmtPct(ytdVal)]);
  retRows.push(["All-time", latestV != null ? fmtPct(latestV) : "N/A"]);

  doc.autoTable({
    startY: ly,
    margin: { left: ML, right: PW - ML - LW },
    head: [["Period", "Return"]],
    body: retRows,
    theme: "plain",
    styles:             { fontSize: 7, cellPadding: 2, textColor: DARK, lineColor: DIV, lineWidth: 0.15 },
    headStyles:         { fillColor: P, textColor: WHITE, fontStyle: "bold", fontSize: 6.5, cellPadding: 2.2 },
    alternateRowStyles: { fillColor: P_PALE },
    columnStyles: {
      0: { cellWidth: 33, fontStyle: "bold" },
      1: { cellWidth: 33, halign: "right" },
    },
    tableWidth: 67,
    didParseCell: d => pctHook(d, 1),
  });
  ly = doc.lastAutoTable.finalY + 5;

  ly = secHead(doc, "Risk Analysis", ML, ly, LW) + 2;

  const riskRows = [
    ["Best Day",         fmtPct(summary.best_day)],
    ["Worst Day",        fmtPct(summary.worst_day)],
    ["Avg Daily Return", fmtPct(summary.avg_day)],
    ["YTD Return",       fmtPct(ytdVal)],
  ];
  if (summary.max_drawdown        != null) riskRows.push(["Max Drawdown",      fmtPct(summary.max_drawdown)]);
  if (summary.volatility          != null) riskRows.push(["Volatility (Ann.)", fmtPct(summary.volatility)]);
  if (summary.sharpe_ratio        != null) riskRows.push(["Sharpe Ratio",      (+summary.sharpe_ratio).toFixed(2)]);
  if (summary.pct_positive_months != null) riskRows.push(["% +ve Months",      `${(+summary.pct_positive_months*100).toFixed(1)}%`]);

  doc.autoTable({
    startY: ly,
    margin: { left: ML, right: PW - ML - LW },
    head: [["Metric", "Value"]],
    body: riskRows,
    theme: "plain",
    styles:             { fontSize: 7, cellPadding: 2, textColor: DARK, lineColor: DIV, lineWidth: 0.15 },
    headStyles:         { fillColor: P, textColor: WHITE, fontStyle: "bold", fontSize: 6.5, cellPadding: 2.2 },
    alternateRowStyles: { fillColor: P_PALE },
    columnStyles: {
      0: { cellWidth: 37, fontStyle: "bold" },
      1: { cellWidth: 29, halign: "right" },
    },
    tableWidth: 67,
    didParseCell: d => pctHook(d, 1),
  });

  const leftBottomY = doc.lastAutoTable.finalY;

  // ── RIGHT COLUMN ──────────────────────────────────────────────────────────────
  const LX  = RX + 3;
  const VX  = RX + RW - 3;
  const ROW = 6;

  const detailData = [
    ["Risk Profile",   strategy?.risk_level || "—"],
    ["Manager",        strategy?.provider_name || "Mint Investments"],
    ["NAV Index",      analytics?.latest_value != null ? (+analytics.latest_value / 100).toFixed(4) : "—"],
    ["Inception",      strategy?.created_at ? new Date(strategy.created_at).toLocaleDateString("en-ZA",{month:"short",year:"numeric"}) : "—"],
    ["Benchmark",      strategy?.benchmark_name || "JSE All Share"],
    ["Min Investment", calculatedMinInvestment ? fmtR(calculatedMinInvestment) : (strategy?.min_investment ? fmtR(strategy.min_investment) : "—")],
    ["Currency",       strategy?.base_currency || "ZAR"],
  ];
  const detailCardH = 4.5 + 5 + detailData.length * ROW + 3;
  fc(doc, P_LITE); doc.roundedRect(RX, ry,       RW, detailCardH, 2, 2, "F");
  fc(doc, P);      doc.roundedRect(RX, ry,       RW, 4.5,         2, 2, "F");
  ry = subHead(doc, "Strategy Details", LX, ry + 7, RW - 6) + 1;

  detailData.forEach(([label, value], i) => {
    if (i % 2 === 0) { fc(doc, P_STRIPE); doc.rect(LX - 1, ry - 1.5, RW - 4, ROW, "F"); }
    doc.setFontSize(6); doc.setFont("helvetica", "normal"); tc(doc, P_DIM);
    doc.text(label, LX, ry + 2.2);
    doc.setFont("helvetica", "bold"); tc(doc, DARK);
    const v = String(value ?? "—");
    doc.text(v.length > 16 ? v.slice(0, 16) + "…" : v, VX, ry + 2.2, { align: "right" });
    ry += ROW;
  });
  ry += 7;

  const feesData = [
    ["Performance Fee",    "20% of profits"],
    ["Transaction Fee",    "0.25% / trade"],
    ["Management Fee",     "None"],
    ["Custody (per ISIN)", "R62 / asset"],
  ];
  const feesCardH = 4.5 + 5 + feesData.length * ROW + 2;
  fc(doc, P_LITE); doc.roundedRect(RX, ry, RW, feesCardH, 2, 2, "F");
  fc(doc, P_MID);  doc.roundedRect(RX, ry, RW, 4.5,       2, 2, "F");
  ry = subHead(doc, "Fees & Charges", LX, ry + 7, RW - 6) + 1;

  feesData.forEach(([label, value], i) => {
    if (i % 2 === 0) { fc(doc, P_STRIPE); doc.rect(LX - 1, ry - 1.5, RW - 4, ROW, "F"); }
    doc.setFontSize(6); doc.setFont("helvetica", "normal"); tc(doc, P_DIM);
    doc.text(label, LX, ry + 2.2);
    doc.setFont("helvetica", "bold"); tc(doc, DARK);
    doc.text(value, VX, ry + 2.2, { align: "right" });
    ry += ROW;
  });
  ry += 7;

  // ── Sector Allocation — Donut Pie Chart (live from Yahoo Finance) ─────────────
  ry = subHead(doc, "Sector Allocation", LX, ry, RW - 6) + 2;

  // Source note: live data badge
  doc.setFont("helvetica", "italic"); doc.setFontSize(4.8); tc(doc, P_DIM);
  doc.text("Live data via Yahoo Finance", LX, ry);
  ry += 3.5;

  if (sectorSlices.length) {
    // Pie fits in the right column: radius sized to available width
    // RW ≈ 62 mm.  We need: pie diameter + legend.
    // Pie radius = 16 mm, legend starts at cx + r + 5 = LX + 16 + 5 = LX + 21
    // Legend max width ≈ RW - 6 - 21 = 35 mm — enough for 17 chars + pct
    const PIE_R  = 16;
    const PIE_CX = LX + PIE_R + 1;
    const PIE_CY = ry + PIE_R + 1;

    const pieBottom = drawPieChart(doc, sectorSlices, PIE_CX, PIE_CY, PIE_R);
    ry = pieBottom + 5;
  } else {
    doc.setFont("helvetica", "normal"); doc.setFontSize(6); tc(doc, P_DIM);
    doc.text("Sector data unavailable", LX, ry + 3);
    ry += 9;
  }

  // ── Portfolio Holdings ────────────────────────────────────────────────────────
  ry = subHead(doc, "Portfolio Holdings", LX, ry, RW - 6) + 2;

  const holdRows = (holdingsWithMetrics || [])
    .filter(h => String(h.symbol || "").toUpperCase() !== "CASH")
    .slice(0, 10)
    .map(h => {
      const wt  = h.weightNorm != null ? (h.weightNorm * 100).toFixed(1) : (+h.weight || 0).toFixed(1);
      const chg = h.change_pct != null ? fmtPct(+h.change_pct / 100) : "—";
      return [h.symbol || "—", `${wt}%`, chg];
    });

  if (holdRows.length) {
    doc.autoTable({
      startY: ry,
      margin: { left: RX, right: MR },
      head: [["Ticker", "Wt", "Chg"]],
      body: holdRows,
      theme: "plain",
      styles:             { fontSize: 5.8, cellPadding: 1.5, textColor: DARK, lineColor: DIV, lineWidth: 0.1 },
      headStyles:         { fillColor: P,  textColor: WHITE, fontStyle: "bold", fontSize: 5.5, cellPadding: 1.8 },
      alternateRowStyles: { fillColor: P_PALE },
      columnStyles: {
        0: { cellWidth: RW * 0.40, fontStyle: "bold" },
        1: { cellWidth: RW * 0.28, halign: "right" },
        2: { cellWidth: RW * 0.28, halign: "right" },
      },
      tableWidth: RW - 2,
      didParseCell: d => pctHook(d, 2),
    });
    ry = doc.lastAutoTable.finalY + 5;
  }

  // ── User Position (if invested) ───────────────────────────────────────────────
  if (userPosition?.invested > 0) {
    const posData = [
      ["Amount Invested", fmtR(userPosition.invested)],
      ["Current Value",   fmtR(userPosition.currentValue)],
      ["Return",          userPosition.returnPct != null ? fmtPct(userPosition.returnPct / 100) : "N/A"],
    ];
    const posCardH = 4.5 + 5 + posData.length * ROW + 2;
    fc(doc, P_LITE); doc.roundedRect(RX, ry, RW, posCardH, 2, 2, "F");
    fc(doc, P);      doc.roundedRect(RX, ry, RW, 4.5,      2, 2, "F");
    ry = subHead(doc, "Your Investment", LX, ry + 7, RW - 6) + 1;

    posData.forEach(([label, value]) => {
      const isPos = label === "Return" && value.startsWith("+");
      const isNeg = label === "Return" && value.startsWith("-");
      doc.setFontSize(6); doc.setFont("helvetica", "normal"); tc(doc, P_DIM);
      doc.text(label + ":", LX, ry + 2.2);
      doc.setFont("helvetica", "bold"); tc(doc, isPos ? GREEN : isNeg ? RED : DARK);
      doc.text(value, VX, ry + 2.2, { align: "right" });
      ry += ROW;
    });
  }

  // ── Compact summary disclosures (bottom of page 1) ───────────────────────────
  const DISC_TOP  = Math.max(leftBottomY, ry) + 7;
  const DISC_COLW = (PW - ML - MR - 8) / 2;
  const DISC_RX   = ML + DISC_COLW + 8;

  const summaryDiscItems = [
    { title: "Regulatory Status",
      body: "Mint Platforms (Pty) Ltd (Reg. 2024/644796/07) trading as MINT, 3 Gwen Lane, Sandown, Sandton. Strategies are not collective investment schemes unless explicitly stated. Not financial advice under FAIS Act No. 37 of 2002. Seek independent advice prior to investing." },
    { title: "Custody & Asset Segregation",
      body: "Client assets held via Computershare Investor Services (Pty) Ltd (CSDP) through Computershare Nominees (Pty) Ltd (Reg. 1999/008543/07). Assets are fully segregated from MINT's own assets at all times." },
    { title: "Performance Disclosure",
      body: "Performance may include historical or back-tested results. Back-tested performance does not represent actual trading and is constructed with hindsight. Performance is gross of fees unless stated. Individual returns may differ based on timing, costs, and taxes." },
    { title: "Risk Warning",
      body: "Past performance does not guarantee future results. Capital is not guaranteed. Strategies are subject to Market, Equity, Volatility, Leverage, Liquidity, Counterparty, Concentration, and Foreign Market risks. See Page 2 for full risk factor disclosures." },
    { title: "Fees Summary",
      body: "Performance fee: 20% of profits. No management or AUM fee. Transaction fee: 0.25% per trade. Custody fees per ISIN are displayed at checkout. Full fee schedule available on request." },
    { title: "Full Disclosures",
      body: "Complete regulatory disclosures, risk factors, legal notices, and the full disclaimer are contained on Page 2 of this factsheet. Please read all disclosures carefully before investing." },
  ];

  doc.setFontSize(5.8);
  const measured = summaryDiscItems.map(d => ({
    ...d,
    lines: doc.splitTextToSize(d.body, DISC_COLW),
  }));
  const leftH  = measured.slice(0, 3).reduce((s, m) => s + 4 + m.lines.length * 2.5 + 4, 0);
  const rightH = measured.slice(3).reduce((s, m)    => s + 4 + m.lines.length * 2.5 + 4, 0);
  const DISC_H = Math.max(leftH, rightH) + 16;

  fc(doc, P_PALE); doc.rect(0, DISC_TOP,     PW, DISC_H, "F");
  fc(doc, P);      doc.rect(0, DISC_TOP,     PW, 3,      "F");
  hl(doc, 0, DISC_TOP + DISC_H - 0.5, PW, DISC_TOP + DISC_H - 0.5, DIV, 0.2);

  doc.setFont("helvetica", "bold"); doc.setFontSize(7); tc(doc, P);
  doc.text("KEY DISCLOSURES & RISK SUMMARY  ·  Full disclosures and legal notices on Page 2", ML, DISC_TOP + 9);

  let dly = DISC_TOP + 14;
  let dry = DISC_TOP + 14;

  measured.forEach((item, i) => {
    const isRight = i >= 3;
    const x = isRight ? DISC_RX : ML;
    let   y = isRight ? dry      : dly;

    doc.setFont("helvetica", "bold");   doc.setFontSize(5.8); tc(doc, P_MID);
    doc.text(item.title, x, y);
    y += 4;
    doc.setFont("helvetica", "normal"); tc(doc, BODY);
    doc.text(item.lines, x, y);
    y += item.lines.length * 2.5 + 4;

    if (isRight) dry = y; else dly = y;
  });

  // ── Footer (page 1) ───────────────────────────────────────────────────────────
  const FY = PH - 12;
  fc(doc, P);     doc.rect(0, FY,   PW, 12,  "F");
  fc(doc, P_MID); doc.rect(0, FY,   PW, 1.2, "F");

  // Logo in footer
  const FL_H = 4.5;
  const FL_W = FL_H * 2.283;
  drawMintLogo(doc, ML, FY + 2.5, FL_H);

  doc.setFont("helvetica", "normal"); doc.setFontSize(5.5); tc(doc, [185, 160, 225]);
  doc.text(`${name}  ·  Strategy Factsheet  ·  ${monthStr}`, ML + FL_W + 4, FY + 5.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5); tc(doc, [160, 130, 205]);
  doc.text(
    "MINT (Pty) Ltd · Authorised FSP 55118 · FSCA Regulated · Registered Credit Provider NCRCP22892 · © 2026 MINT. All rights reserved.",
    ML, FY + 9.5
  );
  tc(doc, [160, 140, 200]);
  doc.text("Page 1 of 2",         PW - MR, FY + 4,   { align: "right" });
  doc.text(`Generated ${isoDate}`, PW - MR, FY + 9.5, { align: "right" });

  // ═════════════════════════════════════════════════════════════════════════════
  //  PAGE 2 — FULL DISCLOSURES
  // ═════════════════════════════════════════════════════════════════════════════
  addDisclosurePage(doc, name, dateStr, monthStr, isoDate);

  // ── Output — mobile-safe ──────────────────────────────────────────────────────
  // On mobile, window.open() is blocked after an await.
  // Solution: caller opens a blank window BEFORE awaiting, passes it here.
  const pdfFilename = `${name.replace(/[^a-zA-Z0-9]/g, "_")}_Factsheet_${isoDate}.pdf`;

  try {
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

    // 1. Use pre-opened window (mobile path)
    if (preOpenedWindow && !preOpenedWindow.closed) {
      preOpenedWindow.location.href = blobUrl;
      return;
    }

    // 2. Try new tab (desktop)
    const newTab = window.open(blobUrl, "_blank");
    if (newTab && !newTab.closed) return;

    // 3. Force download fallback
    const a = document.createElement("a");
    a.href     = blobUrl;
    a.download = pdfFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("[PDF] open fallback triggered:", err);
    doc.save(pdfFilename);
  }
}
