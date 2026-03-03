import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  return new Resend(process.env.RESEND_API_KEY);
}

function parseArticleSections(bodyText) {
  if (!bodyText) return { intro: "", sections: [] };
  const parts = bodyText.split(/----------/);
  const intro = (parts[0] || "").trim();
  const sections = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = (parts[i] || "").trim();
    if (!chunk) continue;
    if (/^[A-Z][A-Z0-9 &\/\-,'.]+$/m.test(chunk.split("\n")[0])) {
      const name = chunk.split("\n")[0].trim();
      sections.push({ name, content: "" });
    } else if (sections.length > 0) {
      sections[sections.length - 1].content +=
        (sections[sections.length - 1].content ? "\n" : "") + chunk;
    }
  }
  return { intro, sections };
}

function textToHtml(text) {
  if (!text) return "";
  return text.replace(/\n/g, "<br/>");
}

function buildMintMorningsHtml(articles) {
  const F = "Inter,Segoe UI,Arial,sans-serif";
  const heroArticle = articles[0];
  const heroBody = heroArticle.body_text || heroArticle.body || "";
  const heroSource = heroArticle.source || "Alliance News South Africa";
  const heroAuthor = heroArticle.author || "";
  const parsed = parseArticleSections(heroBody);

  const marketSections = ["MARKETS"];
  const calendarSections = ["COMPANY CALENDAR", "ECONOMIC CALENDAR"];
  const skipSections = [...marketSections, ...calendarSections, "TOP HEADLINES"];

  const topHeadlines = parsed.sections.find(
    (s) => s.name === "TOP HEADLINES"
  );
  let topHeadlinesBox = "";
  if (topHeadlines && topHeadlines.content) {
    const items = topHeadlines.content
      .split("\n")
      .filter((l) => l.trim())
      .map(
        (l) =>
          `<li style="margin-bottom:6px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">${l.trim()}</li>`
      )
      .join("");
    topHeadlinesBox = `
<tr>
<td style="padding:0 20px 18px 20px;border-top:1px solid #F0F1F6;">
<div class="h2" style="margin-top:14px;font-family:${F};font-size:18px;line-height:24px;color:#121526;font-weight:800;">
Top headlines
</div>
<ul style="margin:8px 0 0 0;padding-left:20px;">${items}</ul>
</td>
</tr>`;
  }

  const artMarkets = parsed.sections.filter((s) =>
    marketSections.includes(s.name)
  );
  const artCalendars = parsed.sections.filter((s) =>
    calendarSections.includes(s.name)
  );
  const artNewsSections = parsed.sections.filter(
    (s) => !skipSections.includes(s.name)
  );

  let artMarketsBox = "";
  if (artMarkets.length > 0) {
    artMarketsBox = `<div style="margin-top:12px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
${artMarkets.map((s) => textToHtml(s.content)).join("<br/><br/>")}
</div>`;
  }

  let artCalendarBox = "";
  if (artCalendars.length > 0) {
    artCalendarBox = artCalendars
      .map(
        (s) => `
<div style="margin-top:14px;">
<div style="font-family:${F};font-size:14px;font-weight:700;color:#121526;">${s.name.charAt(0) + s.name.slice(1).toLowerCase()}</div>
<div style="margin-top:4px;font-family:${F};font-size:13px;line-height:19px;color:#7B8194;">${textToHtml(
          s.content
        )}</div>
</div>`
      )
      .join("");
  }

  let marketOpenCard = "";
  let newsCards = "";

  if (artMarketsBox || artCalendarBox) {
    marketOpenCard = `
<tr>
<td class="px" style="padding:16px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.08);overflow:hidden;">
<tr>
<td style="padding:18px 20px;">
<div class="h2" style="font-family:${F};font-size:18px;line-height:24px;color:#121526;font-weight:800;">
Before the market open
</div>
<div class="muted" style="margin-top:6px;font-family:${F};font-size:13px;line-height:18px;color:#7B8194;">
Key levels and overnight moves
</div>
${artMarketsBox}
${artCalendarBox}
<div style="margin-top:16px;">
<a href="https://www.mymint.co.za" class="btn"
style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
Read more on Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>`;
  }

  artNewsSections.forEach((section) => {
    newsCards += `
<tr>
<td class="px" style="padding:16px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.08);overflow:hidden;">
<tr>
<td style="padding:18px 20px;">
<div class="h2" style="font-family:${F};font-size:18px;line-height:24px;color:#121526;font-weight:800;">
${section.name.charAt(0) + section.name.slice(1).toLowerCase().replace(/\\b\\w/g, (c) => c.toUpperCase())}
</div>
<div style="margin-top:10px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
${textToHtml(section.content)}
</div>
<div style="margin-top:14px;">
<a href="https://www.mymint.co.za" class="btn"
style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
Read more on Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>`;
  });

  function buildArticleCards(article) {
    const body = article.body_text || article.body || "";
    const source = article.source || "Alliance News South Africa";
    const author = article.author || "";
    const artParsed = parseArticleSections(body);
    const artMarkets2 = artParsed.sections.filter((s) =>
      marketSections.includes(s.name)
    );
    const artCalendars2 = artParsed.sections.filter((s) =>
      calendarSections.includes(s.name)
    );
    const artNews2 = artParsed.sections.filter(
      (s) => !skipSections.includes(s.name)
    );

    let artMarketsBox2 = "";
    if (artMarkets2.length > 0) {
      artMarketsBox2 = `<div style="margin-top:12px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
${artMarkets2.map((s) => textToHtml(s.content)).join("<br/><br/>")}
</div>`;
    }

    let artCalendarBox2 = "";
    if (artCalendars2.length > 0) {
      artCalendarBox2 = artCalendars2
        .map(
          (s) => `
<div style="margin-top:14px;">
<div style="font-family:${F};font-size:14px;font-weight:700;color:#121526;">${s.name.charAt(0) + s.name.slice(1).toLowerCase()}</div>
<div style="margin-top:4px;font-family:${F};font-size:13px;line-height:19px;color:#7B8194;">${textToHtml(
            s.content
          )}</div>
</div>`
        )
        .join("");
    }

    let cards = `
<tr>
<td class="px" style="padding:16px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.10);overflow:hidden;">
<tr>
<td style="padding:20px 20px 14px 20px;">
<div style="font-family:${F};font-size:12px;color:#7B8194;">${source}, formatted for Mint</div>
<div class="h1" style="margin-top:10px;font-family:${F};font-size:22px;line-height:28px;color:#121526;font-weight:800;">
${article.title}
</div>
<div style="margin-top:10px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
${textToHtml(artParsed.intro)}
</div>
${author ? `<div style="margin-top:14px;font-family:${F};font-size:13px;color:#7B8194;">By ${author}</div>` : ""}
</td>
</tr>
</table>
</td>
</tr>`;

    if (artMarketsBox2 || artCalendarBox2) {
      cards += `
<tr>
<td class="px" style="padding:16px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.08);overflow:hidden;">
<tr>
<td style="padding:18px 20px;">
<div class="h2" style="font-family:${F};font-size:18px;line-height:24px;color:#121526;font-weight:800;">
Before the market open
</div>
<div class="muted" style="margin-top:6px;font-family:${F};font-size:13px;line-height:18px;color:#7B8194;">
Key levels and overnight moves
</div>
${artMarketsBox2}
${artCalendarBox2}
<div style="margin-top:16px;">
<a href="https://www.mymint.co.za" class="btn"
style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
Read more on Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>`;
    }

    artNews2.forEach((section) => {
      cards += `
<tr>
<td class="px" style="padding:16px 24px 0 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
class="card" style="background:#FFFFFF;border-radius:26px;box-shadow:0 14px 38px rgba(28,22,58,0.08);overflow:hidden;">
<tr>
<td style="padding:18px 20px;">
<div class="h2" style="font-family:${F};font-size:18px;line-height:24px;color:#121526;font-weight:800;">
${section.name.charAt(0) + section.name.slice(1).toLowerCase().replace(/\\b\\w/g, (c) => c.toUpperCase())}
</div>
<div style="margin-top:10px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
${textToHtml(section.content)}
</div>
<div style="margin-top:14px;">
<a href="https://www.mymint.co.za" class="btn"
style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-family:${F};font-size:14px;font-weight:700;line-height:16px;padding:12px 16px;text-decoration:none;">
Read more on Mint
</a>
</div>
</td>
</tr>
</table>
</td>
</tr>`;
    });

    return cards;
  }

  const restArticleCards = articles
    .slice(1)
    .map(buildArticleCards)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>Mint News</title>
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
Johannesburg market preview, SA news, global headlines.
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
Market Brief
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
<td style="padding:20px 20px 14px 20px;">
<div style="font-family:${F};font-size:12px;color:#7B8194;">
${heroSource}, formatted for Mint
</div>

<div class="h1" style="margin-top:10px;font-family:${F};font-size:26px;line-height:32px;color:#121526;font-weight:800;">
${heroArticle.title}
</div>

<div style="margin-top:10px;font-family:${F};font-size:14px;line-height:20px;color:#4B5166;">
${textToHtml(parsed.intro)}
</div>

${heroAuthor ? `<div style="margin-top:14px;font-family:${F};font-size:13px;color:#7B8194;">
By ${heroAuthor}
</div>` : ""}
</td>
</tr>

${topHeadlinesBox}
</table>
</td>
</tr>

${marketOpenCard}

${newsCards}

${restArticleCards}

<tr>
<td class="px" style="padding:18px 24px 28px 24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="padding:16px 18px;background:#FFFFFF;border:1px solid #F0F1F6;border-radius:22px;">
<div style="font-family:${F};font-size:12px;line-height:17px;color:#7B8194;">
Alliance News South Africa covers every actively traded company listed on the Johannesburg Stock Exchange, large and small, and the global influences upon South African markets and the local economy.
<br/><br/>
Copyright &copy; ${new Date().getFullYear()} Alliance News Ltd. All rights reserved.
</div>
<div style="margin-top:12px;font-family:${F};font-size:12px;color:#7B8194;">
You're receiving this on Mint. <a href="https://www.mymint.co.za" style="color:#6D28FF;text-decoration:none;font-weight:700;">Open Mint</a>
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

async function fetchTodaysArticles(supabaseAdmin) {
  const now = new Date();
  const sastNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const todayStart = new Date(
    Date.UTC(sastNow.getUTCFullYear(), sastNow.getUTCMonth(), sastNow.getUTCDate())
  );
  const startUTC = new Date(todayStart.getTime() - 2 * 60 * 60 * 1000).toISOString();

  const { data: articles, error } = await supabaseAdmin
    .from("News_articles")
    .select("*")
    .filter("content_types", "cs", '"ALLBRF"')
    .gte("published_at", startUTC)
    .order("published_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[MINT MORNINGS] Error fetching articles:", error.message);
    return [];
  }
  return articles || [];
}

async function getAllConfirmedUsers(supabaseAdmin) {
  const allUsers = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("[MINT MORNINGS] Error fetching users page " + page + ":", error.message);
      break;
    }

    if (!users || users.length === 0) break;
    allUsers.push(...users);

    if (users.length < perPage) break;
    page++;
  }

  return allUsers.filter((u) => u.email_confirmed_at && u.email);
}

function getSASTDateStr() {
  const now = new Date();
  const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return `${sast.getUTCFullYear()}-${String(sast.getUTCMonth() + 1).padStart(2, "0")}-${String(sast.getUTCDate()).padStart(2, "0")}`;
}

async function checkAlreadySentToday(supabaseAdmin) {
  const todayStr = getSASTDateStr();
  const { data, error } = await supabaseAdmin
    .from("mint_mornings_log")
    .select("id")
    .eq("send_date", todayStr)
    .limit(1);

  if (error) {
    if (error.code === "42P01") return false;
    console.error("[MINT MORNINGS] Error checking send log:", error.message);
    return false;
  }
  return data && data.length > 0;
}

async function markSentToday(supabaseAdmin, articleCount, userCount) {
  const todayStr = getSASTDateStr();
  const { error } = await supabaseAdmin
    .from("mint_mornings_log")
    .insert({ send_date: todayStr, articles_sent: articleCount, users_sent: userCount });

  if (error) {
    if (error.code === "42P01") {
      console.log("[MINT MORNINGS] mint_mornings_log table does not exist — skipping log write. Create it in Supabase for duplicate prevention.");
    } else {
      console.error("[MINT MORNINGS] Error writing send log:", error.message);
    }
  }
}

async function sendToAllUsers(supabaseAdmin, resend, articles) {
  const html = buildMintMorningsHtml(articles);
  const subject = `MINT MORNINGS — ${articles[0].title}`;

  const confirmedUsers = await getAllConfirmedUsers(supabaseAdmin);
  console.log(`[MINT MORNINGS] Sending to ${confirmedUsers.length} confirmed user(s)...`);

  if (confirmedUsers.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const batchSize = 50;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < confirmedUsers.length; i += batchSize) {
    const batch = confirmedUsers.slice(i, i + batchSize);
    const emailPromises = batch.map(async (user) => {
      try {
        await resend.emails.send({
          from: "MINT MORNINGS <mornings@mymint.co.za>",
          to: [user.email],
          subject,
          html,
        });
        successCount++;
      } catch (err) {
        console.error(`[MINT MORNINGS] Failed to send to ${user.email}:`, err.message);
        failCount++;
      }
    });

    await Promise.all(emailPromises);

    if (i + batchSize < confirmedUsers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`[MINT MORNINGS] Complete: ${successCount} sent, ${failCount} failed.`);
  return { sent: successCount, failed: failCount };
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    const alreadySent = await checkAlreadySentToday(supabaseAdmin);
    if (alreadySent) {
      console.log("[MINT MORNINGS] Already sent today — skipping");
      return res.status(200).json({ message: "Already sent today", sent: 0 });
    }

    const resend = getResend();
    const articles = await fetchTodaysArticles(supabaseAdmin);

    if (articles.length === 0) {
      console.log("[MINT MORNINGS] No ALLBRF articles found for today");
      return res.status(200).json({ message: "No articles to send today", sent: 0 });
    }

    console.log(`[MINT MORNINGS] Found ${articles.length} article(s) for today`);

    const result = await sendToAllUsers(supabaseAdmin, resend, articles);

    await markSentToday(supabaseAdmin, articles.length, result.sent);

    return res.status(200).json({
      message: "Mint Mornings sent",
      articles: articles.length,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err) {
    console.error("[MINT MORNINGS] Cron error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
