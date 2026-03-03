const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── SQLite Database ───
const db = new Database('debate_app.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0
  );
`);
console.log('✅ SQLite database ready');

// ─── Auth Routes ───

// Signup
app.post('/signup', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashed);

    console.log(`[signup] New user: ${email}`);
    return res.json({ success: true, message: 'Account created!' });
  } catch (err) {
    console.error('[signup] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email.' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    console.log(`[login] User logged in: ${email}`);
    return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('[login] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Forgot Password — Send OTP
app.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry

    db.prepare('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)').run(email, otp, expiresAt);

    // Print OTP to terminal (instead of sending email)
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║  OTP for ${email}: ${otp}  ║`);
    console.log(`║  (Expires in 5 minutes)              ║`);
    console.log(`╚══════════════════════════════════════╝\n`);

    return res.json({ success: true, message: 'OTP sent! Check the server terminal.' });
  } catch (err) {
    console.error('[forgot-password] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP
app.post('/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const record = db.prepare(
      'SELECT * FROM otps WHERE email = ? AND otp = ? AND used = 0 ORDER BY id DESC LIMIT 1'
    ).get(email, otp);

    if (!record) {
      return res.status(401).json({ error: 'Invalid OTP.' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(401).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Mark OTP as used
    db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(record.id);

    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
    console.log(`[verify-otp] OTP verified for ${email}`);
    return res.json({ success: true, user });
  } catch (err) {
    console.error('[verify-otp] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Gemini & OpenAI Setup ───
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let openai = null;
const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10;
if (hasOpenAI) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('✅ OpenAI initialized for Debater B');
} else {
  console.log('⚠️  No valid OpenAI key — both debaters will use Gemini');
}

async function askGemini(systemPrompt, conversationSoFar) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationSoFar}\n\nNow respond in character. Keep your response to EXACTLY 1 or 2 sentences maximum. Be punchy and direct. No labels or prefixes, just your argument.`;
  const result = await model.generateContent(fullPrompt);
  return result.response?.text ? result.response.text().trim() : '';
}

async function askOpenAI(systemPrompt, conversationSoFar) {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Conversation so far:\n${conversationSoFar}\n\nNow respond in character. Keep your response to EXACTLY 1 or 2 sentences maximum. Be punchy and direct. No labels or prefixes, just your argument.` },
    ],
    max_tokens: 100,
    temperature: 0.8,
  });
  return response.choices[0]?.message?.content?.trim() || '';
}

// ─── Debate Route ───
app.post('/debate', async (req, res) => {
  try {
    const { topic, roles, rounds = 4 } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required.' });

    const roleA = roles?.debaterA || 'Proponent';
    const roleB = roles?.debaterB || 'Opponent';
    console.log(`[/debate] Topic: "${topic}" | ${roleA} (Gemini) vs ${roleB} (${hasOpenAI ? 'OpenAI' : 'Gemini'})`);

    const systemA = `You are "${roleA}" in a debate about "${topic}". Stay in character. Reply with ONLY 1-2 short, punchy sentences. Be witty and direct.`;
    const systemB = `You are "${roleB}" in a debate about "${topic}". Stay in character. Reply with ONLY 1-2 short, punchy sentences. Be witty and direct.`;

    let transcript = '';
    let conversationLog = '';

    for (let round = 1; round <= rounds; round++) {
      console.log(`[/debate] Round ${round}/${rounds}...`);

      const argA = await askGemini(systemA, conversationLog);
      const turnA = `${roleA}: ${argA}`;
      transcript += turnA + '\n\n';
      conversationLog += turnA + '\n';

      let argB;
      if (hasOpenAI && openai) {
        try { argB = await askOpenAI(systemB, conversationLog); }
        catch (e) { console.warn('[/debate] OpenAI failed:', e.message); argB = await askGemini(systemB, conversationLog); }
      } else {
        argB = await askGemini(systemB, conversationLog);
      }

      const turnB = `${roleB}: ${argB}`;
      transcript += turnB + '\n\n';
      conversationLog += turnB + '\n';
    }

    console.log('[/debate] Complete! Length:', transcript.length);
    return res.json({ result: transcript.trim() });
  } catch (err) {
    console.error('[/debate] Error:', err?.message || err);
    res.status(500).json({ error: `Debate Error: ${err.message || 'Unknown error.'}` });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));