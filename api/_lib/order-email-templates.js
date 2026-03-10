const F = "-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Helvetica Neue',sans-serif";

function formatZar(cents) {
  const rands = typeof cents === "number" ? cents / 100 : Number(cents) / 100;
  if (isNaN(rands)) return "R0.00";
  return "R\u202f" + rands.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

function detailCard(label, value) {
  return `
<div style="margin:0 0 10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;overflow:hidden;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding:11px 16px;font-family:${F};font-size:13px;color:#64748b;width:50%;">${label}</td>
      <td style="padding:11px 16px;font-family:${F};font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${value}</td>
    </tr>
  </table>
</div>`;
}

function buildOrderConfirmationHtml({
  assetName,
  assetSymbol,
  amountCents,
  quantity,
  priceCents,
  reference,
  orderDate,
  strategyName,
}) {
  const isStrategy = !!strategyName;
  const displayName = isStrategy ? strategyName : (assetName || assetSymbol || "Unknown Asset");
  const typeLabel = isStrategy ? "Strategy Investment" : "Stock Purchase";

  let cards = "";
  cards += detailCard("Order Type", typeLabel);
  cards += detailCard(isStrategy ? "Strategy" : "Asset", `<strong>${displayName}</strong>`);
  if (assetSymbol && !isStrategy) cards += detailCard("Symbol", assetSymbol);
  cards += detailCard("Amount Invested", `<strong>${formatZar(amountCents)}</strong>`);
  if (quantity) cards += detailCard("Quantity", Number(quantity).toFixed(4) + " shares");
  if (priceCents) cards += detailCard("Price per Share", formatZar(priceCents));
  cards += detailCard("Reference", `<span style="font-size:12px;font-family:monospace;color:#475569;">${reference || "—"}</span>`);
  cards += detailCard("Order Date", formatDate(orderDate || new Date().toISOString()));
  cards += detailCard("Status", `<span style="color:#d97706;font-weight:700;background:#fef3c7;padding:2px 10px;border-radius:20px;font-size:12px;">Pending Settlement</span>`);

  return buildShell({
    preheader: `Order confirmed — ${displayName} · ${formatZar(amountCents)}`,
    eyebrow: "Trade Notification",
    heroTitle: "Order Confirmed",
    heroSubtitle: `Your ${typeLabel.toLowerCase()} for <strong>${displayName}</strong> has been received and is being processed.`,
    headerGradient: "linear-gradient(135deg,#140a2e 0%,#2a0f5e 55%,#4a1d96 100%)",
    statusDot: "#d97706",
    cards,
    ctaLabel: "Track Your Order",
    footerNote: "Your order is pending settlement with our broker. You will receive a second email once the trade is filled and confirmed — typically within 1–3 business days.",
    disclaimer: "This is an automated order notification from Mint. If you did not place this trade, please contact us immediately at <a href='mailto:support@mymint.co.za' style='color:#6d28d9;text-decoration:none;'>support@mymint.co.za</a>.",
  });
}

function buildOrderFillHtml({
  assetName,
  assetSymbol,
  amountCents,
  quantity,
  fillPriceCents,
  reference,
  orderDate,
  fillDate,
  strategyName,
}) {
  const isStrategy = !!strategyName;
  const displayName = isStrategy ? strategyName : (assetName || assetSymbol || "Unknown Asset");
  const typeLabel = isStrategy ? "Strategy Investment" : "Stock Purchase";

  let cards = "";
  cards += detailCard("Order Type", typeLabel);
  cards += detailCard(isStrategy ? "Strategy" : "Asset", `<strong>${displayName}</strong>`);
  if (assetSymbol && !isStrategy) cards += detailCard("Symbol", assetSymbol);
  cards += detailCard("Amount Settled", `<strong>${formatZar(amountCents)}</strong>`);
  if (quantity) cards += detailCard("Shares Filled", Number(quantity).toFixed(4) + " shares");
  if (fillPriceCents) cards += detailCard("Fill Price per Share", formatZar(fillPriceCents));
  cards += detailCard("Reference", `<span style="font-size:12px;font-family:monospace;color:#475569;">${reference || "—"}</span>`);
  if (orderDate) cards += detailCard("Order Date", formatDate(orderDate));
  cards += detailCard("Settlement Date", formatDate(fillDate || new Date().toISOString()));
  cards += detailCard("Status", `<span style="color:#059669;font-weight:700;background:#d1fae5;padding:2px 10px;border-radius:20px;font-size:12px;">Settled ✓</span>`);

  return buildShell({
    preheader: `Order filled — ${displayName} · ${formatZar(amountCents)}`,
    eyebrow: "Settlement Notification",
    heroTitle: "Order Filled",
    heroSubtitle: `Your ${typeLabel.toLowerCase()} for <strong>${displayName}</strong> has been settled. The shares are now in your portfolio.`,
    headerGradient: "linear-gradient(135deg,#052e16 0%,#065f46 55%,#047857 100%)",
    statusDot: "#059669",
    cards,
    ctaLabel: "View My Portfolio",
    footerNote: "Your investment is now reflected in your Mint portfolio. Log in to the app to view your updated holdings, performance and statements.",
    disclaimer: "This is an automated settlement notification from Mint. If you did not place this trade, please contact us immediately at <a href='mailto:support@mymint.co.za' style='color:#6d28d9;text-decoration:none;'>support@mymint.co.za</a>.",
  });
}

function buildShell({ preheader, eyebrow, heroTitle, heroSubtitle, headerGradient, statusDot, cards, ctaLabel, footerNote, disclaimer }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
  <meta content="width=device-width" name="viewport" />
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta content="IE=edge" http-equiv="X-UA-Compatible" />
  <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
  <title>${heroTitle} — Mint</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f8;">

<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${preheader}</div>

<table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f7f8;">
<tr><td align="center" style="padding:24px 12px;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
    style="width:100%;max-width:620px;margin:0 auto;">

    <!-- LOGO BAR -->
    <tr>
      <td style="padding:0 0 16px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="left">
              <img src="https://www.mymint.co.za/assets/mint-logo.svg" width="90" alt="Mint"
                style="display:block;border:0;height:auto;" />
            </td>
            <td align="right"
              style="font-family:${F};font-size:12px;letter-spacing:0.06em;color:#64748b;text-transform:uppercase;font-weight:600;">
              ${eyebrow}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- MAIN CARD -->
    <tr>
      <td style="background:#ffffff;border-radius:18px;border:1px solid #e2e8f0;overflow:hidden;mso-border-alt:none;">

        <!-- GRADIENT HEADER -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background:${headerGradient};padding:32px 28px;">
              <div style="display:inline-block;font-family:${F};font-size:11px;letter-spacing:0.14em;font-weight:700;text-transform:uppercase;color:#e9d5ff;margin-bottom:12px;">
                Mint · Trade Confirmation
              </div>
              <div style="font-family:${F};font-size:28px;line-height:1.2;font-weight:800;color:#ffffff;margin:0 0 8px;">
                ${heroTitle}
              </div>
              <div style="font-family:${F};font-size:14px;line-height:1.6;color:#e2e8f0;">
                ${heroSubtitle}
              </div>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding:24px 28px 8px;background:#ffffff;">
              <p style="margin:0 0 18px;font-family:${F};font-size:14px;line-height:1.7;color:#1e293b;">
                Dear Mint Investor,
              </p>
              <p style="margin:0 0 22px;font-family:${F};font-size:14px;line-height:1.7;color:#334155;">
                Below is a summary of your order. Please review the details and keep this email for your records.
              </p>

              <!-- DETAIL CARDS -->
              ${cards}

              <!-- CTA BUTTON -->
              <div style="margin:24px 0 8px;">
                <a href="https://www.mymint.co.za"
                  style="display:inline-block;background:#4a1d96;color:#ffffff;font-family:${F};font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:10px;letter-spacing:0.02em;">
                  ${ctaLabel} &rarr;
                </a>
              </div>

              <p style="margin:24px 0 0;font-family:${F};font-size:13px;color:#0f172a;font-weight:600;">
                Warm regards,<br />The Mint Team
              </p>
            </td>
          </tr>

          <!-- FOOTER NOTE -->
          <tr>
            <td style="padding:20px 28px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-family:${F};font-size:13px;line-height:1.6;color:#475569;">
                ${footerNote}
              </p>
            </td>
          </tr>

          <!-- LEGAL -->
          <tr>
            <td style="padding:16px 28px 26px;background:#ffffff;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 6px;font-family:${F};font-size:11px;line-height:1.6;color:#94a3b8;">
                ${disclaimer}
              </p>
              <p style="margin:0;font-family:${F};font-size:11px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} Mint. All rights reserved. &nbsp;&middot;&nbsp;
                <a href="https://www.mymint.co.za" style="color:#6d28d9;text-decoration:none;font-weight:600;">www.mymint.co.za</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>

  </table>

</td></tr>
</table>

</body>
</html>`;
}

export { buildOrderConfirmationHtml, buildOrderFillHtml, formatZar, formatDate };
