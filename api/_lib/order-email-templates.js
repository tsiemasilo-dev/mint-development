const F = "Inter,Segoe UI,Arial,sans-serif";

function formatZar(cents) {
  const rands = typeof cents === "number" ? cents / 100 : Number(cents) / 100;
  if (isNaN(rands)) return "R0.00";
  return "R" + rands.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function detailRow(label, value) {
  return `
<tr>
  <td style="padding:8px 0;font-family:${F};font-size:14px;color:#7B8194;border-bottom:1px solid #F0F1F6;">${label}</td>
  <td style="padding:8px 0;font-family:${F};font-size:14px;color:#121526;font-weight:600;text-align:right;border-bottom:1px solid #F0F1F6;">${value}</td>
</tr>`;
}

function buildOrderConfirmationHtml({
  userName,
  assetName,
  assetSymbol,
  orderType,
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
  const dateFormatted = formatDate(orderDate || new Date().toISOString());

  let detailRows = "";
  detailRows += detailRow("Order Type", typeLabel);
  detailRows += detailRow(isStrategy ? "Strategy" : "Asset", displayName);
  if (assetSymbol && !isStrategy) detailRows += detailRow("Symbol", assetSymbol);
  detailRows += detailRow("Amount", formatZar(amountCents));
  if (quantity) detailRows += detailRow("Quantity", Number(quantity).toFixed(4));
  if (priceCents) detailRows += detailRow("Price per unit", formatZar(priceCents));
  detailRows += detailRow("Reference", reference || "—");
  detailRows += detailRow("Date", dateFormatted);
  detailRows += detailRow("Status", '<span style="color:#F59E0B;font-weight:700;">Pending</span>');

  return buildEmailShell({
    preheader: `Order confirmed — ${displayName}`,
    heroTitle: "Order Confirmed",
    heroSubtitle: `Your ${typeLabel.toLowerCase()} has been received and is being processed.`,
    detailRows,
    statusColor: "#F59E0B",
    statusLabel: "Pending Settlement",
    footerNote: "Your order is now pending settlement. You will receive another email once your order has been filled by the broker and confirmed by the CSDP.",
  });
}

function buildOrderFillHtml({
  userName,
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
  const dateFormatted = formatDate(fillDate || new Date().toISOString());

  let detailRows = "";
  detailRows += detailRow("Order Type", typeLabel);
  detailRows += detailRow(isStrategy ? "Strategy" : "Asset", displayName);
  if (assetSymbol && !isStrategy) detailRows += detailRow("Symbol", assetSymbol);
  detailRows += detailRow("Amount", formatZar(amountCents));
  if (quantity) detailRows += detailRow("Quantity Filled", Number(quantity).toFixed(4));
  if (fillPriceCents) detailRows += detailRow("Fill Price", formatZar(fillPriceCents));
  detailRows += detailRow("Reference", reference || "—");
  if (orderDate) detailRows += detailRow("Order Date", formatDate(orderDate));
  detailRows += detailRow("Settlement Date", dateFormatted);
  detailRows += detailRow("Status", '<span style="color:#10B981;font-weight:700;">Confirmed</span>');

  return buildEmailShell({
    preheader: `Order filled — ${displayName}`,
    heroTitle: "Order Filled",
    heroSubtitle: `Your ${typeLabel.toLowerCase()} has been settled and confirmed.`,
    detailRows,
    statusColor: "#10B981",
    statusLabel: "Settlement Complete",
    footerNote: "Your investment is now reflected in your portfolio. Open the Mint app to view your updated holdings.",
  });
}

function buildEmailShell({ preheader, heroTitle, heroSubtitle, detailRows, statusColor, statusLabel, footerNote }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${heroTitle} — Mint</title>
<style>
@media (max-width: 620px) {
.container { width: 100% !important; }
.px { padding-left: 16px !important; padding-right: 16px !important; }
.card { border-radius: 20px !important; }
.h1 { font-size: 22px !important; line-height: 28px !important; }
.h2 { font-size: 16px !important; line-height: 22px !important; }
.muted { font-size: 13px !important; }
.btn { display: block !important; width: 100% !important; }
}
</style>
</head>

<body style="margin:0;padding:0;background:#F6F7FB;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
${preheader}
</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F6F7FB;">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;">

<tr>
<td class="px" style="padding:6px 24px 14px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td align="left" style="padding:0;">
<img
src="https://www.mymint.co.za/assets/mint-logo.svg"
width="110"
alt="Mint"
style="display:block;border:0;outline:none;text-decoration:none;height:auto;"
/>
</td>
<td align="right" style="padding:0;">
<span style="font-family:${F};font-size:13px;color:#7B8194;">
Trade Notification
</span>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.10);overflow:hidden;">

<tr>
<td style="padding:28px 20px 8px 20px;text-align:center;">
<div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:${statusColor}1A;line-height:48px;text-align:center;">
<span style="font-size:24px;">${statusColor === "#10B981" ? "&#10003;" : "&#9202;"}</span>
</div>
<div class="h1" style="margin-top:14px;font-family:${F};font-size:26px;line-height:32px;color:#121526;font-weight:800;">
${heroTitle}
</div>
<div style="margin-top:8px;font-family:${F};font-size:14px;line-height:20px;color:#7B8194;">
${heroSubtitle}
</div>
</td>
</tr>

<tr>
<td style="padding:20px 20px 4px 20px;">
<div style="display:inline-block;padding:4px 12px;border-radius:20px;background:${statusColor}1A;font-family:${F};font-size:12px;font-weight:700;color:${statusColor};">
${statusLabel}
</div>
</td>
</tr>

<tr>
<td style="padding:16px 20px 24px 20px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
${detailRows}
</table>
</td>
</tr>

</table>
</td>
</tr>

<tr>
<td class="px" style="padding:18px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.08);overflow:hidden;">
<tr>
<td style="padding:18px 20px;">
<div style="font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
${footerNote}
</div>
<div style="margin-top:16px;">
<a href="https://www.mymint.co.za" class="btn"
style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
Open Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:18px 24px 28px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="padding:16px 18px;background:#FFFFFF;border:1px solid #F0F1F6;border-radius:22px;">
<div style="font-family:${F};font-size:12px;line-height:17px;color:#7B8194;">
This is an automated notification from Mint. If you did not make this transaction, please contact us immediately.
<br/><br/>
&copy; ${new Date().getFullYear()} Mint. All rights reserved.
</div>
<div style="margin-top:12px;font-family:${F};font-size:12px;color:#7B8194;">
<a href="https://www.mymint.co.za" style="color:#6D28FF;text-decoration:none;font-weight:700;">www.mymint.co.za</a>
</div>
</td>
</tr>
</table>
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>`;
}

export { buildOrderConfirmationHtml, buildOrderFillHtml, formatZar, formatDate };
