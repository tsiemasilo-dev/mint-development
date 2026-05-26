// Generates mint-pricing-issues.docx — a Word document cataloguing all
// pricing and data-source issues discovered in the Mint codebase audit.
// Uses adm-zip (existing dep) to hand-assemble the OOXML package.

const AdmZip = require("adm-zip");
const path = require("path");

const OUT_PATH = path.join(__dirname, "..", "mint-pricing-issues.docx");

// ── XML helpers ──────────────────────────────────────────────────────────────
function xe(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function h1(text) {
  return `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${xe(text)}</w:t></w:r></w:p>`;
}

function h2(text) {
  return `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${xe(text)}</w:t></w:r></w:p>`;
}

function h3(text) {
  return `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>${xe(text)}</w:t></w:r></w:p>`;
}

// Normal paragraph — supports inline bold/normal segments via array
// p("hello")  or  p([{t:"bold part",b:true},{t:" normal"}])
function p(content, color) {
  const colorXml = color ? `<w:color w:val="${color}"/>` : "";
  if (typeof content === "string") {
    return `<w:p><w:r><w:rPr>${colorXml}</w:rPr><w:t xml:space="preserve">${xe(content)}</w:t></w:r></w:p>`;
  }
  const runs = content.map(seg => {
    const rPrParts = [];
    if (seg.b) rPrParts.push("<w:b/>");
    if (seg.color) rPrParts.push(`<w:color w:val="${seg.color}"/>`);
    if (seg.mono) rPrParts.push(`<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="18"/><w:szCs w:val="18"/>`);
    const rPr = rPrParts.length ? `<w:rPr>${rPrParts.join("")}</w:rPr>` : "";
    return `<w:r>${rPr}<w:t xml:space="preserve">${xe(seg.t)}</w:t></w:r>`;
  }).join("");
  return `<w:p>${runs}</w:p>`;
}

function bullet(text, indent = 0) {
  const ilvl = indent;
  return `<w:p>
    <w:pPr>
      <w:ind w:left="${720 + indent * 360}" w:hanging="360"/>
    </w:pPr>
    <w:r><w:t xml:space="preserve">${indent === 0 ? "•  " : "–  "}${xe(text)}</w:t></w:r>
  </w:p>`;
}

function mono(text) {
  return `<w:p>
    <w:pPr><w:ind w:left="720"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>
        <w:sz w:val="18"/><w:szCs w:val="18"/>
        <w:color w:val="1E1B4B"/>
      </w:rPr>
      <w:t xml:space="preserve">${xe(text)}</w:t>
    </w:r>
  </w:p>`;
}

function blank() {
  return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>`;
}

function rule() {
  return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr></w:pPr></w:p>`;
}

// Status pill in text: [CRITICAL], [BUG], [FIXED], [INFO]
function badge(label) {
  const colors = { CRITICAL:"C0392B", BUG:"E67E22", FIXED:"27AE60", INFO:"2980B9", WARNING:"8E44AD" };
  const c = colors[label] || "555555";
  return `<w:r><w:rPr><w:b/><w:color w:val="${c}"/></w:rPr><w:t>[${label}]</w:t></w:r>`;
}

function pWithBadge(label, text) {
  return `<w:p>${badge(label)}<w:r><w:t xml:space="preserve">  ${xe(text)}</w:t></w:r></w:p>`;
}

// ── Document body ─────────────────────────────────────────────────────────────
const body = [

  // Title block
  `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Mint — Pricing &amp; Data Source Audit</w:t></w:r></w:p>`,
  p([{t:"Prepared: ", b:true},{t:"24 May 2026"}]),
  p([{t:"Scope: ", b:true},{t:"Parent direct-stock pricing, child dashboard pricing, portfolio card PnL, data source consistency"}]),
  blank(),
  rule(),
  blank(),

  // ── Section 1 ─────────────────────────────────────────────────────────────
  h1("1. securities_c.last_price Is Obsolete"),
  pWithBadge("CRITICAL", "All parent-side direct-stock pricing is built on a stale field."),
  blank(),
  p("The securities_c table has a last_price column that was once the live price feed. It is no longer updated in real time. The two tables that now carry live and accurate prices are:"),
  blank(),
  bullet("stock_intraday_c.current_price  — real-time intraday price (cents)"),
  bullet("client_strategy_returns_c.basket_value  — pre-computed daily strategy basket value (cents)"),
  blank(),
  p("securities_c.last_price reflects the end-of-day closing price from the previous trading session. During market hours it is stale by definition. Nothing in the parent-side portfolio pipeline currently overrides it with an intraday price."),
  blank(),

  // ── Section 2 ─────────────────────────────────────────────────────────────
  h1("2. Parent Holdings API — Stale Price Source"),
  pWithBadge("CRITICAL", "api/user/holdings.js uses securities_c.last_price as its only price source."),
  blank(),
  p("This is the most critical issue because this single API endpoint is the source of truth for all downstream parent-facing calculations."),
  blank(),
  h3("What the API does"),
  p("On every call it:"),
  bullet("Reads stock_holdings_c for quantity and avg_fill (cents)"),
  bullet("Reads securities_c for last_price (Rands — stale EOD)"),
  bullet("Reads stock_returns_c as a fallback if securities_c has no price"),
  bullet("Recalculates and overwrites market_value and unrealized_pnl fresh from the stale price"),
  bullet("Normalises last_price from Rands to cents before returning to the client"),
  blank(),
  h3("The calculation"),
  mono("livePriceRands  = securities_c.last_price          // Rands, stale EOD"),
  mono("livePrice       = round(livePriceRands × 100)      // → cents"),
  mono("liveMarketValue = livePrice × quantity              // cents × filled shares"),
  mono("costBasis       = avg_fill  × quantity              // cents × filled shares"),
  mono("pnl             = liveMarketValue − costBasis       // cents"),
  blank(),
  p("The API then sets last_price = livePrice (cents) on each returned holding, which is what all downstream consumers read."),
  blank(),
  h3("Correct fix"),
  bullet("Join stock_intraday_c in the API instead of relying on securities_c.last_price"),
  bullet("Use stock_intraday_c.current_price (cents) as primary — no conversion needed, already cents"),
  bullet("Fall back to securities_c.last_price × 100 only when intraday row is absent"),
  blank(),

  // ── Section 3 ─────────────────────────────────────────────────────────────
  h1("3. Parent Home Carousel — Stale Pricing (fetchBestAssets)"),
  pWithBadge("CRITICAL", "fetchBestAssets in HomePage.jsx queries securities_c directly, bypassing the holdings API."),
  blank(),
  p("The best-assets carousel on the home page runs its own independent Supabase query and treats securities_c.last_price as the live price:"),
  blank(),
  mono("// securities_c.last_price treated as Rands"),
  mono("livePriceCents = round(sec.last_price × 100)"),
  mono("livePriceRands = livePriceCents / 100"),
  mono("marketVal      = (livePriceCents × filledQty) / 100   // Rands"),
  mono("costBasis      = (avgFillCents   × filledQty) / 100   // Rands"),
  mono("pnlRands       = marketVal − costBasis"),
  blank(),
  p("This path also does not use stock_intraday_c. The StockStackedModal (per-batch breakdown) uses livePriceRands passed from this same calculation, so every batch PnL shown to the user is also stale."),
  blank(),
  h3("Correct fix"),
  bullet("Fetch stock_intraday_c rows alongside securities_c in fetchBestAssets"),
  bullet("Use intraday current_price / 100 as livePriceRands when available"),
  bullet("Fall back to securities_c.last_price only when intraday is missing"),
  blank(),

  // ── Section 4 ─────────────────────────────────────────────────────────────
  h1("4. Portfolio Card Split Personality"),
  pWithBadge("BUG", "The total value and the PnL on SwipeableBalanceCard come from different sources."),
  blank(),
  p("The portfolio balance card shows two numbers — a total value and a period PnL. These are calculated from entirely different tables:"),
  blank(),
  p([{t:"Total value:", b:true}]),
  bullet("Direct stocks: last_price (cents, stale from securities_c via holdings API) × filled quantity / 100"),
  bullet("Strategies: client_strategy_returns_c.basket_value (correct, pre-computed)"),
  blank(),
  p([{t:"Period PnL (1D / 5D / 1M / YTD tabs):", b:true}]),
  bullet("Direct stocks: stock_returns_c columns — 1d_pnl, 5d_pnl, 1m_pnl, ytd_pnl"),
  bullet("Strategies: client_strategy_returns_c — same column names"),
  blank(),
  p("Because the total value uses a stale last_price while the PnL uses stock_returns_c (which may reflect a different price snapshot), the two figures can be inconsistent. A user could see a total value of R12,000 but a PnL that does not reconcile back to any cost basis derivable from that R12,000."),
  blank(),
  h3("Correct fix"),
  bullet("Once the holdings API is fixed to use stock_intraday_c, the total value will reflect the real live price"),
  bullet("The PnL from stock_returns_c is pre-computed and reasonable — the inconsistency resolves once the value source is corrected"),
  blank(),

  // ── Section 5 ─────────────────────────────────────────────────────────────
  h1("5. useFinancialData — All Portfolio Totals Are Stale"),
  pWithBadge("CRITICAL", "useFinancialData.js is the main data hook for the parent. It is entirely downstream of api/user/holdings."),
  blank(),
  p("Every portfolio total, goal progress value, and daily-change figure the parent sees flows through this hook:"),
  blank(),
  mono("// last_price here is cents — returned by the holdings API (from securities_c)"),
  mono("const liveVal = (h) =>"),
  mono("  h.last_price != null ? (h.last_price × h.quantity) / 100"),
  mono("                       : (h.market_value || 0) / 100;"),
  mono(""),
  mono("totalInvestments = holdings.reduce((s, h) => s + liveVal(h), 0);"),
  mono("costBasisTotal   = holdings.reduce((s, h) => s + (avg_fill × quantity) / 100, 0);"),
  mono("dailyChange      = totalInvestments − costBasisTotal;  // mislabelled — actually total unrealised PnL"),
  blank(),
  p("Fixing api/user/holdings.js to return intraday-priced last_price values will automatically correct all of these downstream figures without any changes needed in useFinancialData.js itself."),
  blank(),
  p([{t:"Note on naming: ", b:true},{t:"The variable is called dailyChange but it is actually total unrealised PnL (current value minus all-time cost basis). It is not a single-day return."}]),
  blank(),

  // ── Section 6 ─────────────────────────────────────────────────────────────
  h1("6. Child Dashboard — last_price Fallback Bug"),
  pWithBadge("BUG", "getHoldingLivePriceRands in ChildDashboardPage returns last_price without dividing by 100."),
  blank(),
  p("The child dashboard prices holdings correctly using stock_intraday_c as the primary source. However, its fallback to securities_c.last_price has a unit error:"),
  blank(),
  mono("// stock_intraday_c path — correct"),
  mono("const intradayCents = Number(holding.intraday_price_cents);"),
  mono("if (intradayCents > 0) return intradayCents / 100;  // → Rands ✓"),
  mono(""),
  mono("// securities_c fallback — BUG: last_price is cents, but no /100"),
  mono("const lastPrice = Number(holding.last_price);"),
  mono("if (lastPrice > 0) return lastPrice;  // ← returns cents as if Rands, 100× too large"),
  blank(),
  p("When intraday data is unavailable (cold start, off-market hours), the child's market value is inflated 100× and the PnL is wildly incorrect. Cost basis remains correct (avg_fill / 100) so the PnL shows a false massive gain."),
  blank(),
  h3("One-line fix"),
  mono("// Change:"),
  mono("return lastPrice;"),
  mono("// To:"),
  mono("return lastPrice / 100;"),
  blank(),
  p([{t:"Additional note:", b:true},{t:" The requirement is that there should be no fallback to last_price for the child at all. The child should only price from stock_intraday_c. The fallback path should be removed once intraday data coverage is confirmed reliable."}]),
  blank(),

  // ── Section 7 ─────────────────────────────────────────────────────────────
  h1("7. Unit Inconsistency Across the Codebase"),
  pWithBadge("WARNING", "securities_c.last_price is treated as Rands in some files and cents in others."),
  blank(),
  p("Because securities_c.last_price is obsolete and multiple developers have touched it over time, it is handled inconsistently:"),
  blank(),
  bullet("api/user/holdings.js — treats as Rands, multiplies by 100 (correct assumption)"),
  bullet("fetchBestAssets (HomePage.jsx) — treats as Rands, multiplies by 100 (correct assumption)"),
  bullet("strategyUtils.js getAdjustedShares — divides by 100 (treats as cents — inconsistent)"),
  bullet("strategyUtils.js calculateYtdReturn — names it lastPriceCents (treats as cents — inconsistent)"),
  bullet("SwipeableBalanceCard child mode — multiplies by 100 (treats as Rands)"),
  blank(),
  p("This inconsistency is a latent correctness risk. The field should be replaced entirely with stock_intraday_c.current_price to remove ambiguity. Once that migration is done, all references to securities_c.last_price can be removed."),
  blank(),

  // ── Section 8 ─────────────────────────────────────────────────────────────
  h1("8. What Is Already Correct"),
  pWithBadge("FIXED", "The following paths use the right data sources today."),
  blank(),
  bullet("Strategy current value (parent): client_strategy_returns_c.basket_value — correct"),
  bullet("Strategy PnL periods (parent): client_strategy_returns_c pre-computed columns — correct"),
  bullet("Child direct stock pricing (primary): stock_intraday_c.current_price — correct"),
  bullet("Strategy minimum investment calc: enrichSecuritiesWithIntradayPrices() added by mintdev pull — now prefers intraday over last_price"),
  bullet("Markets page / Factsheet / Open Strategies: enrichSecuritiesWithIntradayPrices() — correct"),
  bullet("Parent activity feed: family_member_id IS NULL filter added — child transactions excluded"),
  blank(),

  // ── Section 9 ─────────────────────────────────────────────────────────────
  h1("9. Recommended Fix Priority"),
  blank(),
  p([{t:"Priority 1 — api/user/holdings.js", b:true, color:"C0392B"}]),
  bullet("Join stock_intraday_c per security_id, use current_price (cents) as primary livePrice"),
  bullet("Fall back to securities_c.last_price × 100 only when no intraday row exists"),
  bullet("This single change fixes: useFinancialData totals, NewPortfolioPage value, SwipeableBalanceCard total, goal progress values — all automatically"),
  blank(),
  p([{t:"Priority 2 — fetchBestAssets (HomePage.jsx)", b:true, color:"C0392B"}]),
  bullet("Fetch stock_intraday_c alongside securities_c"),
  bullet("Use intraday current_price / 100 as livePriceRands when available"),
  bullet("Fixes: home carousel per-stock value and PnL, StockStackedModal batch breakdown"),
  blank(),
  p([{t:"Priority 3 — Child dashboard fallback (ChildDashboardPage.jsx)", b:true, color:"E67E22"}]),
  bullet("Change: return lastPrice  →  return lastPrice / 100"),
  bullet("Or preferably: remove the last_price fallback entirely; only use intraday"),
  blank(),
  p([{t:"Priority 4 — Audit remaining last_price references", b:true, color:"E67E22"}]),
  bullet("Credit pages (ActiveLiquidity.jsx, InstantLiquidity.jsx)"),
  bullet("StatementsPage.jsx"),
  bullet("FamilyDashboardPage.jsx"),
  bullet("GiftStrategyPickerPage.jsx"),
  bullet("All use securities_c.last_price directly — each needs intraday enrichment"),
  blank(),
  rule(),
  blank(),

  // ── Summary table ──────────────────────────────────────────────────────────
  h1("10. Summary Table"),
  blank(),

  // Table
  `<w:tbl>
    <w:tblPr>
      <w:tblStyle w:val="TableGrid"/>
      <w:tblW w:w="9360" w:type="dxa"/>
      <w:tblBorders>
        <w:top    w:val="single" w:sz="4" w:color="CBD5E1"/>
        <w:left   w:val="single" w:sz="4" w:color="CBD5E1"/>
        <w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/>
        <w:right  w:val="single" w:sz="4" w:color="CBD5E1"/>
        <w:insideH w:val="single" w:sz="4" w:color="CBD5E1"/>
        <w:insideV w:val="single" w:sz="4" w:color="CBD5E1"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="3200"/>
      <w:gridCol w:w="2400"/>
      <w:gridCol w:w="2400"/>
      <w:gridCol w:w="1360"/>
    </w:tblGrid>
    ${tableRow(["Component","Price Source Used","Should Use","Status"], true)}
    ${tableRow(["api/user/holdings.js","securities_c.last_price (EOD Rands)","stock_intraday_c.current_price","CRITICAL"])}
    ${tableRow(["fetchBestAssets (HomePage)","securities_c.last_price (EOD Rands)","stock_intraday_c.current_price","CRITICAL"])}
    ${tableRow(["useFinancialData portfolio totals","last_price from holdings API (stale)","Fixed by fixing holdings API","CRITICAL"])}
    ${tableRow(["SwipeableBalanceCard total value","last_price × qty (stale)","Fixed by fixing holdings API","CRITICAL"])}
    ${tableRow(["SwipeableBalanceCard PnL tabs","stock_returns_c pre-computed","stock_returns_c (already correct)","WARNING"])}
    ${tableRow(["Child dashboard pricing (primary)","stock_intraday_c.current_price","stock_intraday_c.current_price","CORRECT"])}
    ${tableRow(["Child dashboard pricing (fallback)","securities_c.last_price without /100","Remove fallback or fix /100","BUG"])}
    ${tableRow(["Strategy value (parent)","client_strategy_returns_c basket_value","client_strategy_returns_c","CORRECT"])}
    ${tableRow(["Strategy minimums / Markets page","enrichSecuritiesWithIntradayPrices","stock_intraday_c (already correct)","CORRECT"])}
  </w:tbl>`,

  blank(),
].join("\n");

function tableRow(cells, isHeader = false) {
  const fill = isHeader ? "<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"1E1B4B\"/>" : "";
  const fontColor = isHeader ? "<w:color w:val=\"FFFFFF\"/>" : "";
  const bold = isHeader ? "<w:b/>" : "";
  const statusColors = { CRITICAL:"C0392B", BUG:"E67E22", CORRECT:"27AE60", WARNING:"8E44AD", "CORRECT":"27AE60" };

  return `<w:tr>
    ${cells.map((cell, i) => {
      const isStatus = !isHeader && i === 3;
      const statusColor = isStatus ? (statusColors[cell] || "555555") : null;
      const cellColor = isStatus ? (statusColor ? `<w:color w:val="${statusColor}"/>` : "") : fontColor;
      return `<w:tc>
        <w:tcPr>${fill}<w:tcW w:w="${[3200,2400,2400,1360][i]}" w:type="dxa"/></w:tcPr>
        <w:p><w:r><w:rPr>${bold}${cellColor}</w:rPr><w:t xml:space="preserve">${xe(cell)}</w:t></w:r></w:p>
      </w:tc>`;
    }).join("")}
  </w:tr>`;
}

// ── Styles ───────────────────────────────────────────────────────────────────
const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      <w:sz w:val="22"/><w:szCs w:val="22"/>
      <w:lang w:val="en-ZA"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:spacing w:before="0" w:after="200"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="52"/><w:szCs w:val="52"/><w:color w:val="1E1B4B"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="480" w:after="120"/><w:keepNext/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="1E1B4B"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="320" w:after="80"/><w:keepNext/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="2C3E50"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:spacing w:before="200" w:after="60"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="34495E"/></w:rPr>
  </w:style>

  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
  </w:style>
</w:styles>`;

// ── Assemble document XML ────────────────────────────────────────────────────
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"
               w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>
</w:settings>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"   ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"   Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;

// ── Zip it up ────────────────────────────────────────────────────────────────
const zip = new AdmZip();
zip.addFile("[Content_Types].xml",        Buffer.from(contentTypes, "utf8"));
zip.addFile("_rels/.rels",               Buffer.from(rootRels,     "utf8"));
zip.addFile("word/document.xml",          Buffer.from(documentXml,  "utf8"));
zip.addFile("word/_rels/document.xml.rels", Buffer.from(docRels,   "utf8"));
zip.addFile("word/styles.xml",            Buffer.from(stylesXml,   "utf8"));
zip.addFile("word/settings.xml",          Buffer.from(settingsXml, "utf8"));
zip.writeZip(OUT_PATH);

console.log(`✅  Written: ${OUT_PATH}`);
