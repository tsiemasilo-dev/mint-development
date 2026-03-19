const { Resend } = require('resend');

let _resend = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      // Return null instead of throwing an error to allow the app to run.
      return null;
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const processedDocIds = new Set();
const pendingArticles = [];
const SEND_HOUR_UTC = 5;
const SEND_MINUTE_UTC = 0;
let lastSendDate = null;
let startupCatchUpDone = false;

function parseArticleSections(bodyText) {
  if (!bodyText) return { intro: '', sections: [] };
  const parts = bodyText.split(/----------/);
  const intro = (parts[0] || '').trim();
  const sections = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = (parts[i] || '').trim();
    if (!chunk) continue;
    if (/^[A-Z][A-Z0-9 &\/\-,'.]+$/m.test(chunk.split('\n')[0])) {
      const name = chunk.split('\n')[0].trim();
      sections.push({ name, content: '' });
    } else if (sections.length > 0) {
      sections[sections.length - 1].content += (sections[sections.length - 1].content ? '\n' : '') + chunk;
    }
  }
  return { intro, sections };
}

function textToHtml(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br/>');
}

function buildMintMorningsHtml(articles) {
  const F = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif`;
  const heroArticle = articles[0];
  const heroBody = heroArticle.body_text || heroArticle.body || '';
  const parsed = parseArticleSections(heroBody);

  const marketSections = ['MARKETS'];
  const calendarSections = ['COMPANY CALENDAR', 'ECONOMIC CALENDAR'];
  const marketOpenSections = [...marketSections, ...calendarSections, 'ECONOMICS'];

  const publishedDate = heroArticle.published_at ? new Date(heroArticle.published_at) : new Date();
  const formattedDate = publishedDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = publishedDate.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

  function sectionTitle(name) {
    return name.charAt(0) + name.slice(1).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  function articleCard(article, isHero) {
    const body = article.body_text || article.body || '';
    const src = article.source || 'Alliance News South Africa';
    const author = article.author || '';
    const artParsed = isHero ? parsed : parseArticleSections(body);
    const artMarketData = artParsed.sections.filter(s => marketSections.includes(s.name));
    const artCalendarData = artParsed.sections.filter(s => calendarSections.includes(s.name));
    const artEconomicsData = artParsed.sections.filter(s => s.name === 'ECONOMICS');
    const artNewsSections = artParsed.sections.filter(s => !marketOpenSections.includes(s.name));
    const artHasMarketOpen = artMarketData.length > 0 || artCalendarData.length > 0;
    const artIndustries = Array.isArray(article.industries) ? article.industries : [];
    const artMarkets = Array.isArray(article.markets) ? article.markets : [];
    const topics = [...artIndustries, ...artMarkets];

    let bodyHtml = `<p style="margin:0 0 16px;">${textToHtml(artParsed.intro)}</p>`;

    if (artHasMarketOpen) {
      if (artMarketData.length > 0) {
        bodyHtml += `
        <p style="margin:0 0 8px;font-weight:700;color:#0f172a;">Markets</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:16px;">
          <p style="margin:0;font-size:13px;line-height:1.625;color:#334155;">${textToHtml(artMarketData[0].content)}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Figures reflect changes since the prior Johannesburg equities close.</p>
        </div>`;
      }
      [...artCalendarData, ...artEconomicsData].forEach(s => {
        bodyHtml += `
        <p style="margin:0 0 6px;font-weight:700;color:#0f172a;">${sectionTitle(s.name)}</p>
        <p style="margin:0 0 16px;">${textToHtml(s.content)}</p>`;
      });
    }

    artNewsSections.forEach(s => {
      bodyHtml += `
      <p style="margin:0 0 8px;font-weight:700;color:#0f172a;">${sectionTitle(s.name)}</p>
      <p style="margin:0 0 20px;">${textToHtml(s.content)}</p>`;
    });

    if (author) {
      bodyHtml += `<p style="margin:16px 0 0;font-size:12px;color:#64748b;">By ${author}</p>`;
    }

    const topicsHtml = topics.length > 0 ? `
      <div style="margin-top:28px;border-top:1px solid #f1f5f9;padding-top:20px;">
        <div style="font-family:${F};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:10px;">Related Topics</div>
        ${topics.map(t => `<span style="display:inline-block;border:1px solid #e2e8f0;border-radius:9999px;background:#ffffff;padding:4px 12px;font-family:${F};font-size:12px;font-weight:500;color:#475569;margin:0 6px 6px 0;">${t}</span>`).join('')}
      </div>` : '';

    const headerRow = isHero ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="border-bottom:1px solid #f1f5f9;padding-bottom:20px;margin-bottom:20px;">
        <tr>
          <td width="48" valign="middle" style="padding-right:12px;">
            <div style="width:48px;height:48px;border-radius:50%;background:#f1f5f9;text-align:center;line-height:48px;">
              <img src="https://www.mymint.co.za/assets/mint-logo.png" width="24" height="24" alt="Mint"
                style="display:inline-block;vertical-align:middle;border:0;outline:none;" />
            </div>
          </td>
          <td valign="middle">
            <div style="font-family:${F};font-size:14px;font-weight:600;color:#0f172a;line-height:1.4;">Mint News</div>
            <div style="font-family:${F};font-size:12px;color:#64748b;margin-top:2px;">${formattedDate} &bull; ${formattedTime}</div>
          </td>
        </tr>
      </table>` : '';

    const titleSize = isHero ? '24px' : '18px';

    return `
    <tr>
      <td style="padding:${isHero ? '0' : '14px'} 16px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          class="card" style="max-width:600px;background:#ffffff;border-radius:24px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.10),0 2px 4px -2px rgba(0,0,0,0.10);overflow:hidden;">
          <tr>
            <td style="padding:24px 24px 0 24px;">
              ${headerRow}
              <div style="margin-bottom:14px;">
                <span style="display:inline-block;background:#f1f5f9;border-radius:9999px;padding:4px 12px;font-family:${F};font-size:12px;font-weight:600;color:#475569;margin-right:8px;">${src}</span>
                ${article.channel ? `<span style="display:inline-block;background:#ede9fe;border-radius:9999px;padding:4px 12px;font-family:${F};font-size:12px;font-weight:600;color:#6d28d9;">${article.channel}</span>` : ''}
              </div>
              <div style="font-family:${F};font-size:${titleSize};line-height:1.3;font-weight:700;color:#0f172a;margin-bottom:14px;">${article.title}</div>
              <div style="font-family:${F};font-size:14px;line-height:1.625;color:#334155;">
                ${bodyHtml}
              </div>
              ${topicsHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 24px;">
              <a href="https://www.mymint.co.za" style="background:#6d28d9;border-radius:12px;color:#ffffff;display:inline-block;font-family:${F};font-size:13px;font-weight:700;line-height:1;padding:12px 18px;text-decoration:none;">Read more on Mint</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  const heroCardHtml = articleCard(heroArticle, true);
  const restCardsHtml = articles.slice(1).map(a => articleCard(a, false)).join('\n');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
  <meta content="width=device-width" name="viewport" />
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta content="IE=edge" http-equiv="X-UA-Compatible" />
  <style>
    @media only screen and (max-width: 600px) {
      .wrap { padding: 16px 8px !important; }
      .card { border-radius: 20px !important; }
      .card td { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
    Johannesburg market preview, SA news, global headlines.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8fafc">
    <tr>
      <td class="wrap" align="center" style="padding:32px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          ${heroCardHtml}
          ${restCardsHtml}
          <tr>
            <td style="padding:14px 16px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:16px 18px;background:#ffffff;border:1px solid #f1f5f9;border-radius:20px;">
                    <div style="font-family:${F};font-size:12px;line-height:1.6;color:#94a3b8;">
                      Alliance News South Africa covers every actively traded company listed on the Johannesburg Stock Exchange, large and small, and the global influences upon South African markets and the local economy.<br/><br/>
                      Copyright &copy; ${new Date().getFullYear()} Alliance News Ltd. All rights reserved.
                    </div>
                    <div style="margin-top:10px;font-family:${F};font-size:12px;color:#94a3b8;">
                      You're receiving this on Mint. <a href="https://www.mymint.co.za" style="color:#6d28d9;text-decoration:none;font-weight:700;">Open Mint</a>
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

async function sendEmailToAllUsers(supabaseAdmin, article) {
  const resend = getResend();
  if (!resend) {
    console.warn('[MINT MORNINGS] No RESEND_API_KEY configured, cannot send emails.');
    return;
  }

  const docId = article.doc_id;
  console.log(`[MINT MORNINGS] Sending article doc_id=${docId} "${article.title}" to all users...`);
  const html = buildMintMorningsHtml([article]);

  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    console.error('[MINT MORNINGS] Error fetching users:', usersError.message);
    return;
  }

  const confirmedUsers = users.filter(u => u.email_confirmed_at && u.email);
  console.log(`[MINT MORNINGS] Sending to ${confirmedUsers.length} confirmed user(s)...`);

  if (confirmedUsers.length === 0) {
    console.log('[MINT MORNINGS] No confirmed users to send to.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < confirmedUsers.length; i++) {
    const user = confirmedUsers[i];
    try {
      const resp = await resend.emails.send({
        from: 'MINT MORNINGS <mornings@mymint.co.za>',
        to: [user.email],
        subject: `MINT MORNINGS — ${article.title}`,
        html: html,
      });
      if (resp.error) {
        console.error(`[MINT MORNINGS] Failed to send to ${user.email}:`, resp.error.message);
        failCount++;
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`[MINT MORNINGS] Failed to send to ${user.email}:`, err.message);
      failCount++;
    }
    if (i < confirmedUsers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  console.log(`[MINT MORNINGS] doc_id=${docId} complete: ${successCount} sent, ${failCount} failed.`);
}

let lastCheckedAt = null;
let pollingInterval = null;
let isInitialized = false;

async function initializeLastCheckedAt(supabaseAdmin) {
  try {
    const { data, error } = await supabaseAdmin
      .from('News_articles')
      .select('created_at')
      .filter('content_types', 'cs', '"ALLBRF"')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[MINT MORNINGS] Failed to get last article timestamp:', error.message);
      lastCheckedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      return;
    }

    if (data && data.length > 0) {
      lastCheckedAt = data[0].created_at;
      console.log(`[MINT MORNINGS] Initialized from latest article: ${lastCheckedAt}`);
    } else {
      lastCheckedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      console.log(`[MINT MORNINGS] No existing articles, using 24h lookback: ${lastCheckedAt}`);
    }
  } catch (err) {
    console.error('[MINT MORNINGS] Init error:', err.message);
    lastCheckedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  }
}

async function pollForNewArticles(supabaseAdmin) {
  try {
    if (!isInitialized) {
      await initializeLastCheckedAt(supabaseAdmin);
      isInitialized = true;
    }

    const { data: articles, error } = await supabaseAdmin
      .from('News_articles')
      .select('*')
      .filter('content_types', 'cs', '"ALLBRF"')
      .gt('created_at', lastCheckedAt)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[MINT MORNINGS] Polling error:', error.message);
      return;
    }

    if (!articles || articles.length === 0) return;

    for (const article of articles) {
      const docIdStr = String(article.doc_id);
      if (processedDocIds.has(docIdStr)) continue;

      processedDocIds.add(docIdStr);
      pendingArticles.push(article);
      console.log(`[MINT MORNINGS] New ALLBRF article queued: doc_id=${docIdStr} "${article.title}" (pending: ${pendingArticles.length})`);
    }

    lastCheckedAt = articles[articles.length - 1].created_at;

    if (processedDocIds.size > 10000) {
      const entries = Array.from(processedDocIds);
      entries.splice(0, entries.length - 5000).forEach(id => processedDocIds.delete(id));
    }
  } catch (err) {
    console.error('[MINT MORNINGS] Polling unexpected error:', err.message);
  }
}

function getSASTDateStr() {
  const now = new Date();
  const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return `${sast.getUTCFullYear()}-${String(sast.getUTCMonth() + 1).padStart(2, '0')}-${String(sast.getUTCDate()).padStart(2, '0')}`;
}

async function fetchTodaysArticles(supabaseAdmin) {
  const now = new Date();
  const sastNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const todayStart = new Date(Date.UTC(sastNow.getUTCFullYear(), sastNow.getUTCMonth(), sastNow.getUTCDate()));
  const startUTC = new Date(todayStart.getTime() - 2 * 60 * 60 * 1000).toISOString();

  const { data: articles, error } = await supabaseAdmin
    .from('News_articles')
    .select('*')
    .filter('content_types', 'cs', '"ALLBRF"')
    .gte('published_at', startUTC)
    .order('published_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[MINT MORNINGS] Error fetching today\'s articles:', error.message);
    return [];
  }
  return articles || [];
}

async function checkScheduledSend(supabaseAdmin) {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const todayStr = getSASTDateStr();

  const isScheduledTime = currentHour === SEND_HOUR_UTC && currentMinute >= SEND_MINUTE_UTC && currentMinute < SEND_MINUTE_UTC + 2;
  const isCatchUp = !startupCatchUpDone && currentHour >= SEND_HOUR_UTC;

  if ((isScheduledTime || isCatchUp) && lastSendDate !== todayStr) {
    if (isCatchUp) {
      startupCatchUpDone = true;
      console.log(`[MINT MORNINGS] Server started after 07:00 SAST — checking for unsent articles...`);
    }

    const articles = await fetchTodaysArticles(supabaseAdmin);

    if (articles.length === 0) {
      console.log(`[MINT MORNINGS] ${isScheduledTime ? '07:00 SAST' : 'Catch-up'} — no ALLBRF articles found for today`);
      if (isScheduledTime) lastSendDate = todayStr;
      return;
    }

    lastSendDate = todayStr;
    console.log(`[MINT MORNINGS] ${isScheduledTime ? '07:00 SAST' : 'Catch-up'} — sending ${articles.length} ALLBRF article(s)...`);

    for (const article of articles) {
      await sendEmailToAllUsers(supabaseAdmin, article);
    }

    console.log(`[MINT MORNINGS] ${isScheduledTime ? '07:00 SAST' : 'Catch-up'} send complete`);
  }
}

function startMintMorningsListener(supabaseAdmin) {
  if (!supabaseAdmin) {
    console.error('[MINT MORNINGS] No Supabase admin client available');
    return null;
  }

  if (!getResend()) {
    console.warn('[MINT MORNINGS] No RESEND_API_KEY configured. Mint Mornings email listener will not start.');
    return null;
  }

  pollForNewArticles(supabaseAdmin);

  pollingInterval = setInterval(() => {
    pollForNewArticles(supabaseAdmin);
  }, 30000);

  setInterval(() => {
    checkScheduledSend(supabaseAdmin);
  }, 60000);

  setTimeout(() => {
    checkScheduledSend(supabaseAdmin);
  }, 5000);

  console.log(`[MINT MORNINGS] Listener started — polling every 30s, scheduled send at 07:00 SAST (05:00 UTC), catch-up enabled`);
  return pollingInterval;
}

async function sendTestEmail(supabaseAdmin, testEmail) {
  if (!supabaseAdmin) {
    console.error('[MINT MORNINGS TEST] No Supabase admin client available');
    return { success: false, error: 'No database connection' };
  }
  const resend = getResend();
  if (!resend) {
    console.error('[MINT MORNINGS TEST] No RESEND_API_KEY configured');
    return { success: false, error: 'No RESEND_API_KEY' };
  }
  console.log(`[MINT MORNINGS TEST] Sending test email to ${testEmail}...`);

  const { data: articles, error: articlesError } = await supabaseAdmin
    .from('News_articles')
    .select('*')
    .filter('content_types', 'cs', '"ALLBRF"')
    .order('published_at', { ascending: false })
    .limit(1);

  if (articlesError) {
    console.error('[MINT MORNINGS TEST] Error fetching articles:', articlesError.message);
    return { success: false, error: articlesError.message };
  }

  if (!articles || articles.length === 0) {
    return { success: false, error: 'No ALLBRF articles found in the database' };
  }

  const article = articles[0];
  console.log(`[MINT MORNINGS TEST] Using article doc_id=${article.doc_id} "${article.title}"`);
  const html = buildMintMorningsHtml([article]);

  try {
    const resendResponse = await resend.emails.send({
      from: 'MINT MORNINGS <mornings@mymint.co.za>',
      to: [testEmail],
      subject: `MINT MORNINGS — ${article.title}`,
      html: html,
    });
    console.log(`[MINT MORNINGS TEST] Resend API response:`, JSON.stringify(resendResponse));
    console.log(`[MINT MORNINGS TEST] Test email sent to ${testEmail}`);
    return { success: true, doc_id: article.doc_id, title: article.title, resendResponse };
  } catch (err) {
    console.error(`[MINT MORNINGS TEST] Failed:`, err.message, err);
    return { success: false, error: err.message };
  }
}

module.exports = { startMintMorningsListener, sendTestEmail, buildMintMorningsHtml };
