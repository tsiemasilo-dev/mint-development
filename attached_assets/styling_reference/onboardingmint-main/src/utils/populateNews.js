import { supabase } from '../lib/supabase.js';

const sampleNews = [
  {
    title: "Fed Signals Rate Cuts in Q2 2026 Amid Cooling Inflation",
    author: "Sarah Martinez",
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    body: "The Federal Reserve hinted at potential interest rate cuts in the second quarter of 2026, citing sustained progress on inflation targets. Chair Jerome Powell stated that the central bank is closely monitoring economic indicators and remains data-dependent.",
    source: "Financial Times",
    image_url: null,
    topics: ["Monetary Policy", "Federal Reserve", "Interest Rates"]
  },
  {
    title: "Tech Stocks Rally as AI Investments Surge 40%",
    author: "Michael Chen",
    published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    body: "Major technology companies reported record AI infrastructure spending, with investments up 40% year-over-year. NVIDIA and Microsoft lead the charge as enterprise AI adoption accelerates across industries.",
    source: "Bloomberg",
    image_url: null,
    topics: ["Technology", "Artificial Intelligence", "Markets"]
  },
  {
    title: "Emerging Markets See Capital Inflows Hit 5-Year High",
    author: "Priya Sharma",
    published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    body: "Developing economies attracted $45 billion in foreign investment last month, the highest level since 2021. Investors are diversifying portfolios amid stabilizing currencies and improving growth outlooks in Asia and Latin America.",
    source: "Reuters",
    image_url: null,
    topics: ["Emerging Markets", "Global Economy", "Investment"]
  },
  {
    title: "Gold Prices Reach New Record on Geopolitical Uncertainty",
    author: "David Thompson",
    published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    body: "Gold futures surged to $2,450 per ounce, breaking previous records as investors seek safe-haven assets. Analysts predict continued strength in precious metals amid ongoing global tensions.",
    source: "CNBC",
    image_url: null,
    topics: ["Commodities", "Gold", "Safe Haven"]
  },
  {
    title: "Renewable Energy Sector Attracts $180B in Global Investment",
    author: "Emma Watson",
    published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    body: "The renewable energy sector secured $180 billion in investments during Q1 2026, driven by favorable policies and declining technology costs. Solar and wind projects lead the expansion across North America and Europe.",
    source: "Wall Street Journal",
    image_url: null,
    topics: ["Renewable Energy", "ESG", "Investment"]
  },
  {
    title: "Banking Sector Reports Strong Q1 Earnings Beat Expectations",
    author: "Robert Johnson",
    published_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    body: "Major banks exceeded analyst expectations with Q1 earnings reports, showing resilient loan growth and improved net interest margins. JPMorgan and Bank of America led gains with strong trading revenues.",
    source: "Financial Times",
    image_url: null,
    topics: ["Banking", "Earnings", "Finance"]
  },
  {
    title: "Crypto Market Cap Crosses $3 Trillion Mark",
    author: "Lisa Zhang",
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    body: "The cryptocurrency market capitalization exceeded $3 trillion for the first time, driven by institutional adoption and regulatory clarity. Bitcoin and Ethereum account for 65% of the total market value.",
    source: "CoinDesk",
    image_url: null,
    topics: ["Cryptocurrency", "Bitcoin", "Digital Assets"]
  },
  {
    title: "Global Supply Chains Show Continued Recovery",
    author: "James Wilson",
    published_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
    body: "International shipping costs dropped 25% as supply chain disruptions ease. Container availability improved and port congestion decreased significantly across major trade routes.",
    source: "Bloomberg",
    image_url: null,
    topics: ["Supply Chain", "Logistics", "Trade"]
  },
  {
    title: "Consumer Confidence Index Reaches 18-Month High",
    author: "Amanda Rodriguez",
    published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    body: "Consumer confidence climbed to its highest level in 18 months, reflecting optimism about job security and wage growth. Retail spending showed strength across categories.",
    source: "Reuters",
    image_url: null,
    topics: ["Consumer Confidence", "Retail", "Economy"]
  },
  {
    title: "ESG Funds Outperform Traditional Portfolios in 2026",
    author: "Sophie Anderson",
    published_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    body: "Environmental, Social, and Governance-focused investment funds delivered superior returns year-to-date, averaging 12% gains. Sustainable investing continues to attract millennial and Gen-Z investors.",
    source: "Financial Times",
    image_url: null,
    topics: ["ESG", "Sustainable Investing", "Performance"]
  }
];

export async function populateNewsArticles() {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return { success: false, error: 'Supabase not initialized' };
  }

  console.log('🔍 Checking News_articles table access...');

  // First, check if table exists and is accessible
  const { data: existing, error: checkError } = await supabase
    .from('News_articles')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('❌ Error accessing News_articles table:', checkError);
    console.error('Table name or RLS policy issue detected.');
    return { success: false, error: checkError };
  }

  console.log('✅ News_articles table is accessible');

  // Insert sample news
  console.log('📰 Inserting sample news articles...');
  const { data, error } = await supabase
    .from('News_articles')
    .insert(sampleNews)
    .select();

  if (error) {
    console.error('❌ Error inserting news articles:', error);
    return { success: false, error };
  }

  console.log(`✅ Successfully inserted ${data.length} news articles`);
  data.forEach((article, idx) => {
    console.log(`  ${idx + 1}. ${article.title}`);
  });

  return { success: true, data };
}

// Export for browser console access
if (typeof window !== 'undefined') {
  window.populateNewsArticles = populateNewsArticles;
}
