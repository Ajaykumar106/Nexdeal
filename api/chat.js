// NexDeal — Vercel Serverless Function
// Handles: AI Chat (Groq) + Telegram Product Requests
// All secrets are read from Vercel Environment Variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, messages, system, product, name } = req.body;

  // ── TELEGRAM PRODUCT REQUEST ──
  if (type === 'telegram') {
    const BOT = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT = process.env.TELEGRAM_CHAT_ID;
    if (!BOT || !CHAT) {
      return res.status(200).json({ ok: true, note: 'Telegram not configured yet' });
    }
    try {
      const msg = `🆕 *New Product Request!*\n📦 Product: *${product}*\n👤 Name: ${name || 'Anonymous'}\n🌐 Via: NexDeal Website\n⏰ ${new Date().toLocaleString('en-IN')}`;
      const r = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT, text: msg, parse_mode: 'Markdown' })
      });
      const d = await r.json();
      return res.status(200).json({ ok: d.ok });
    } catch (e) {
      return res.status(500).json({ error: 'Telegram error' });
    }
  }

  // ── GROQ AI CHAT ──
  const GROQ = process.env.GROQ_API_KEY;
  if (!GROQ) {
    return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel Environment Variables' });
  }
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }
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
          {
            role: 'system',
            content: system || `You are NexDeal AI — India's smartest electronics shopping assistant built by Ajaykumar106 (CSE student).

Help users:
- Find best deals on electronics in India
- Compare Amazon vs Flipkart prices honestly
- Recommend products based on budget in Indian Rupees
- Answer specs, features, buying advice

Rules:
- Always use Indian Rupees (₹)
- Be concise, add emojis
- Mention both Amazon and Flipkart
- Give honest opinions
- Suggest visiting nexdeal-ten.vercel.app for live prices`
          },
          ...messages.slice(-10)
        ],
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const reply = data.choices?.[0]?.message?.content || 'Sorry, try again!';
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: 'AI service unavailable' });
  }
}
