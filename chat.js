export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, messages, system, product, name } = req.body;

  // TELEGRAM
  if (type === 'telegram') {
    const BOT = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT = process.env.TELEGRAM_CHAT_ID;
    if (!BOT || !CHAT) return res.status(200).json({ ok: true });
    try {
      const msg = `🆕 *New Product Request!*\n📦 Product: *${product}*\n👤 Name: ${name || 'Anonymous'}\n🌐 Via: NexDeal Website\n⏰ ${new Date().toLocaleString('en-IN')}`;
      const r = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT, text: msg, parse_mode: 'Markdown' })
      });
      return res.status(200).json({ ok: (await r.json()).ok });
    } catch(e) { return res.status(200).json({ ok: false }); }
  }

  const GROQ = process.env.GROQ_API_KEY;
  if (!GROQ) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });

  const TODAY = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const YEAR = new Date().getFullYear();

  const defaultSystem = `You are NexDeal AI — India's smartest electronics shopping assistant in ${YEAR}.

Today's date: ${TODAY}. Current year: ${YEAR}.

REAL INDIAN PRICES (April 2026 — always say prices may vary, check Amazon/Flipkart for latest):

SMARTPHONES:
- iPhone 17 (128GB) → ₹79,900 | iPhone 17 Plus → ₹89,900 | iPhone 17 Pro → ₹1,19,900 | iPhone 17 Pro Max → ₹1,34,900
- Samsung Galaxy S25 (256GB) → ₹80,999 | S25+ → ₹99,999 | S25 Ultra → ₹1,29,999
- OnePlus 13 (256GB) → ₹69,999 | OnePlus 13R → ₹42,999
- Nothing Phone 3a → ₹19,999 | Nothing Phone 3a Pro → ₹27,999
- Realme GT 7 Pro (256GB) → ₹41,999
- Google Pixel 9 → ₹79,999 | Pixel 9 Pro → ₹1,09,999
- Xiaomi 15 → ₹64,999 | Xiaomi 14 Civi → ₹42,999
- Vivo X200 Pro → ₹94,999 | Vivo V50 → ₹32,999
- Motorola Edge 50 Fusion → ₹22,999
- Samsung Galaxy A55 → ₹34,999 | A35 → ₹26,999 | A16 → ₹14,999
- Redmi Note 14 Pro+ → ₹26,999 | Note 14 → ₹16,999
- Poco X7 Pro → ₹22,999 | Poco M6 Pro → ₹14,999

LAPTOPS:
- MacBook Air M4 (16GB/256GB) → ₹99,900 | (16GB/512GB) → ₹1,19,900
- MacBook Pro M4 14" → ₹1,69,900
- Dell XPS 13 → ₹1,09,999 | Dell Inspiron 15 i5 → ₹52,999 | i7 → ₹64,999
- HP Pavilion 15 → ₹54,999 | HP Victus (i5) → ₹57,999
- Lenovo IdeaPad Slim 3 → ₹36,999 | ThinkPad E14 → ₹72,999
- ASUS VivoBook 15 → ₹39,999 | ROG Strix G16 → ₹1,24,999
- Acer Aspire 3 → ₹32,999 | Nitro V → ₹67,999

AUDIO:
- Sony WH-1000XM6 → ₹28,990 | XM5 → ₹22,990 | WF-1000XM5 (TWS) → ₹18,990
- Apple AirPods 4 → ₹13,900 | AirPods Pro 2 → ₹24,900
- Samsung Galaxy Buds 3 Pro → ₹17,999
- boAt Airdopes 141 → ₹699 | Airdopes 311 Pro → ₹1,299
- Noise Buds VS104 → ₹999 | Noise Shots X5 → ₹1,799
- realme Buds Air 6 → ₹2,999
- JBL Tune 770NC → ₹4,999 | Live 770NC → ₹7,999

SMARTWATCHES:
- Apple Watch Series 10 → ₹46,900 | Ultra 2 → ₹89,900
- Samsung Galaxy Watch 7 → ₹29,999 | Watch Ultra → ₹61,999
- Noise ColorFit Ultra 3 → ₹2,499 | ColorFit Pro 5 → ₹3,499
- boAt Wave Sigma 3 → ₹1,299 | Storm Call 3 → ₹1,799
- Amazfit GTR 4 → ₹12,999 | GTS 4 Mini → ₹7,999
- Garmin Forerunner 265 → ₹39,990

CAMERAS:
- Sony ZV-E10 II → ₹64,990 | Alpha A7 IV → ₹2,49,990
- Canon EOS R50 → ₹67,990 | M50 Mark II → ₹59,990
- Fujifilm X-T50 → ₹1,29,999

ACCESSORIES:
- Anker 65W GaN Charger → ₹2,499 | 100W → ₹3,499
- Apple MagSafe Charger → ₹3,900
- Samsung 45W Charger → ₹1,999

YOUR RULES:
1. Always say "prices may vary — check Amazon/Flipkart for latest price"
2. Always mention both Amazon and Flipkart with affiliate note
3. Use ₹ for all prices
4. Be confident about 2025-2026 products — NEVER say they don't exist
5. For budget questions — give TOP 3 with clear recommendation
6. Suggest nexdeal-ten.vercel.app for live price comparison
7. Add relevant emojis, keep responses concise
8. For comparisons — give a CLEAR WINNER with reasons`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.6,
        messages: [
          { role: 'system', content: system || defaultSystem },
          ...messages.slice(-10)
        ],
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    return res.status(200).json({ reply: data.choices?.[0]?.message?.content || 'Sorry, try again!' });
  } catch(e) {
    return res.status(500).json({ error: 'AI service unavailable' });
  }
}
