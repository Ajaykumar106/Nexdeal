export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, messages, system, product, name } = req.body;

  // TELEGRAM PRODUCT REQUEST
  if (type === 'telegram') {
    const BOT = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT = process.env.TELEGRAM_CHAT_ID;
    if (!BOT || !CHAT) return res.status(200).json({ ok: true });
    try {
      const msg = `🆕 *New Product Request!*\n📦 Product: *${product}*\n👤 Name: ${name || 'Anonymous'}\n🌐 Via: NexDeal Website\n⏰ ${new Date().toLocaleString('en-IN')}`;
      const r = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT, text: msg, parse_mode: 'Markdown' })
      });
      const d = await r.json();
      return res.status(200).json({ ok: d.ok });
    } catch(e) {
      return res.status(200).json({ ok: false });
    }
  }

  // GROQ AI CHAT
  const GROQ = process.env.GROQ_API_KEY;
  if (!GROQ) return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel Environment Variables' });
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });

  const TODAY = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const YEAR = new Date().getFullYear();

  // DEFAULT system prompt if none provided
  const defaultSystem = `You are NexDeal AI — India's smartest electronics shopping assistant.

CRITICAL FACTS:
- Today's date is ${TODAY}
- Current year is ${YEAR}
- You are NOT limited to 2023 knowledge
- You KNOW about 2025-2026 products

PRODUCTS YOU KNOW (2025-2026):
- iPhone 17, 17 Plus, 17 Pro, 17 Pro Max (Apple, 2025)
- Samsung Galaxy S25, S25+, S25 Ultra (Samsung, Jan 2025)
- Apple MacBook Air M4 (2025), MacBook Pro M4 (2024)
- OnePlus 13, OnePlus 13R (2025)
- Realme GT 7 Pro (2024)
- Google Pixel 9, 9 Pro (2024)
- Nothing Phone 3a (2025)
- Sony WH-1000XM6 (2025)
- Apple Watch Series 10, Ultra 2 (2024)
- Samsung Galaxy Watch 7, Ultra (2024)
- boAt, Noise, Realme latest 2025-26 products

RULES:
- Always use Indian Rupees ₹
- Mention Amazon and Flipkart for buying
- Be confident about 2025-2026 products
- NEVER say iPhone 17 or S25 don't exist
- Suggest nexdeal-ten.vercel.app for live comparison
- Be concise, helpful, add relevant emojis`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          { role: 'system', content: system || defaultSystem },
          ...messages.slice(-10)
        ],
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const reply = data.choices?.[0]?.message?.content || 'Sorry, try again!';
    return res.status(200).json({ reply });
  } catch(error) {
    return res.status(500).json({ error: 'AI service unavailable' });
  }
}
