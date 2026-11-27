// ===== 1. API KEY & MODELS =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

// ===== 2. MEMORY =====
const PASSWORD_REPLY = /^(?:Your strong password:|ఇదిగో strong password:)/i;
let MEMORY = [];
try {
  const stored = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
  if (Array.isArray(stored)) {
    MEMORY = stored.filter(m =>
      m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' &&
      !(m.role === 'model' && PASSWORD_REPLY.test(m.text)));
    if (MEMORY.length !== stored.length) saveMemory();
  } else {
    localStorage.removeItem('jarvis_memory');
  }
} catch (e) {
  localStorage.removeItem('jarvis_memory');
}
function saveMemory() { localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY.slice(-50))); }

// ===== DOM =====
const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');
const clearBtn = document.getElementById('clear-btn');
const camBtn = document.getElementById('cam-btn');
const imgInput = document.getElementById('img-input');

function add(text, cls) {
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}
MEMORY.forEach(m => add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));

// ===== 3. TOOLS =====
async function fetchToolJson(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function stripHtml(html) {
  return new DOMParser().parseFromString(String(html || ''), 'text/html').body.textContent || '';
}

function openTab(url) { window.open(url, '_blank', 'noopener,noreferrer'); }

async function handleTools(text) {
  if (/^\s*(?:please\s+)?(?:open\s+youtube|youtube\s+open|youtube)(?:\s+please)?[.!?]*\s*$/i.test(text)) {
    openTab('https://youtube.com');
    return 'Opening YouTube, Boss.';
  }
  if (/^\s*(?:please\s+)?(?:open\s+google|google\s+open|google)(?:\s+please)?[.!?]*\s*$/i.test(text)) {
    openTab('https://google.com');
    return 'Opening Google, Boss.';
  }

  const urlCommand = text.match(/^\s*(?:open|visit|go to)\s+(https?:\/\/\S+)\s*$/i);
  if (urlCommand) {
    try {
      const dest = new URL(urlCommand[1]);
      if (dest.protocol !== 'https:' && dest.protocol !== 'http:') return 'Only http and https links can be opened.';
      openTab(dest.href);
      return 'Opening ' + dest.hostname + ', Boss.';
    } catch (e) { return 'That link does not look valid.'; }
  }

  if (/^\s*(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s*$/i.test(text)) return 'Tell me what to search for on Google.';
  const googleSearch = text.match(/^\s*(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s+(.+?)\s*$/i);
  if (googleSearch) {
    const q = googleSearch[1].trim();
    openTab('https://www.google.com/search?q=' + encodeURIComponent(q));
    return 'Searching Google for ' + q + ', Boss.';
  }

  const videoQuery = (
    text.match(/^\s*play\s+(.+?)\s*$/i) ||
    text.match(/^\s*youtube(?:\s+search)?(?:\s+for)?\s+(.+?)\s*$/i) ||
    text.match(/^\s*search\s+(?:on\s+)?youtube(?:\s+for)?\s+(.+?)\s*$/i)
  )?.[1]?.trim();
  if (videoQuery) {
    openTab('https://www.youtube.com/results?search_query=' + encodeURIComponent(videoQuery));
    return 'Searching YouTube for ' + videoQuery + ', Boss.';
  }

  if (/\b(?:current\s+time|time\s+now|what\s+time)\b/i.test(text)) {
    return 'Current time: ' + new Date().toLocaleString();
  }

  if (/^\s*(?:(?:what(?:'s| is) )?the )?weather(?:\s+(?:now|today))?\??\s*$/i.test(text)) {
    try {
      // Hyderabad coordinates
      const data = await fetchToolJson('https://api.open-meteo.com/v1/forecast?latitude=17.385&longitude=78.4867&current_weather=true');
      const w = data?.current_weather;
      if (!w) return 'Weather data not available, Boss.';
      return 'Hyderabad weather: ' + w.temperature + '°C, wind ' + w.windspeed + ' km/h.';
    } catch (e) { return 'Weather error, Boss.'; }
  }

  if (/^\s*(?:latest\s+|top\s+)?news\s*$/i.test(text)) {
    try {
      const ids = await fetchToolJson('https://hacker-news.firebaseio.com/v0/topstories.json');
      const items = await Promise.all(ids.slice(0, 3).map(id => fetchToolJson('https://hacker-news.firebaseio.com/v0/item/' + id + '.json')));
      return 'Top news: ' + items.map((s, i) => (i + 1) + '. ' + s.title).join(' | ');
    } catch (e) { return 'News error, Boss.'; }
  }

  if (/\b(?:bitcoin|btc)\b/i.test(text) && !/\bplan\b/i.test(text)) {
    try {
      const data = await fetchToolJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr');
      return 'Bitcoin: $' + data.bitcoin.usd.toLocaleString() + ' / ₹' + data.bitcoin.inr.toLocaleString();
    } catch (e) { return 'Crypto error, Boss.'; }
  }

  const searchMatch = text.match(/^\s*(?:search|look up)\s+(?:for\s+)?(.+?)\s*$/i);
  if (searchMatch) {
    const q = searchMatch[1].trim();
    try {
      const url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&srsearch=' +
        encodeURIComponent(q) + '&format=json&origin=*';
      const result = (await fetchToolJson(url))?.query?.search?.[0];
      if (!result) return 'I could not find that, Boss.';
      const snippet = stripHtml(result.snippet);
      return 'Wikipedia summary: ' + result.title + (snippet ? '. ' + snippet : '');
    } catch (e) { return 'Search error, Boss.'; }
  }

  return null; // no tool matched
}

// ===== 3.5. AGENT MODE =====
const AGENT_TOOLS = Object.freeze({
  time: () => handleTools('current time'),
  weather: () => handleTools('weather'),
  news: () => handleTools('news'),
  crypto: () => handleTools('bitcoin')
});

function isAgentModeRequest(text = '') {
  const v = String(text);
  if (/\b(?:agent(?:\s+mode)?|run\s+(?:the\s+)?agent|use\s+(?:the\s+)?agent)\b/i.test(v)) return true;
  if (/\b(?:briefing|research|analy[sz]e|analysis)\b/i.test(v)) return true;
  return /\bplan\b/i.test(v) && /\b(?:time|weather|news|crypto|bitcoin|btc)\b/i.test(v);
}

function fallbackAgentToolPlan(goal) {
  const g = String(goal).toLowerCase();
  const plan = [];
  if (/time/.test(g)) plan.push('time');
  if (/weather/.test(g)) plan.push('weather');
  if (/news/.test(g)) plan.push('news');
  if (/crypto|bitcoin|btc/.test(g)) plan.push('crypto');
  return plan.length ? plan : Object.keys(AGENT_TOOLS);
}

function parseAgentToolPlan(responseText) {
  const text = String(responseText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('['), end = text.lastIndexOf(']');
  if (start < 0 || end < start) throw new Error('Agent plan format incorrect.');
  const parsed = JSON.parse(text.slice(start, end + 1));
  return [...new Set(parsed
    .filter(i => typeof i === 'string')
    .map(i => i.trim().toLowerCase())
    .filter(i => i in AGENT_TOOLS))];
}

async function runAgent(goal) {
  add('J.A.R.V.I.S: Agent mode active.', 'ai');
  add('J.A.R.V.I.S: Goal analyze chesthunna...', 'ai');
  let tools;
  try {
    tools = parseAgentToolPlan(await callGeminiRaw('Select tools from ["time","weather","news","crypto"]. Return only a JSON array. Goal: ' + JSON.stringify(String(goal))));
  } catch (e) {
    tools = fallbackAgentToolPlan(goal);
  }
  const results = {};
  for (let i = 0; i < tools.length; i++) {
    add('J.A.R.V.I.S: [' + (i + 1) + '/' + tools.length + '] ' + tools[i] + ' tool run chesthunna...', 'ai');
    try { results[tools[i]] = await AGENT_TOOLS[tools[i]](); } catch (e) { results[tools[i]] = 'Tool error'; }
  }
  add('J.A.R.V.I.S: Results combine chesthunna...', 'ai');
  return callGemini('Goal: ' + JSON.stringify(String(goal)) + '. Tool results: ' + JSON.stringify(results) + '. Give concise Telugu/English summary.');
}

// ===== 4. GEMINI BRAIN =====
async function requestGemini(contents) {
  if (!API_KEY) throw new Error('Gemini API key is missing.');
  let lastError;
  for (const model of MODELS) {
    try {
      const res = await fetch(API_BASE + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body: JSON.stringify({ contents })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'HTTP ' + res.status);
      const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
      if (reply) return reply;
      throw new Error('Empty response from ' + model);
    } catch (e) {
      lastError = e; // try next model
    }
  }
  throw lastError || new Error('All models failed.');
}

// Raw call: no memory (used for agent planning)
function callGeminiRaw(p) {
  return requestGemini([{ role: 'user', parts: [{ text: p }] }]);
}

// Chat call: with memory and optional image
async function callGemini(p, image = null) {
  const contents = MEMORY.slice(-12).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
  const parts = [{ text: p }];
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.data } });
  contents.push({ role: 'user', parts });
  const reply = await requestGemini(contents);
  MEMORY.push({ role: 'user', text: p }, { role: 'model', text: reply });
  saveMemory();
  return reply;
}

// ===== 5. IMAGE INPUT =====
let pendingImage = null;
camBtn?.addEventListener('click', () => imgInput?.click());
imgInput?.addEventListener('change', () => {
  const file = imgInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingImage = { mime: file.type, data: String(reader.result).split(',')[1] };
    add('J.A.R.V.I.S: Image attached. Ask your question, Boss.', 'ai');
  };
  reader.readAsDataURL(file);
  imgInput.value = '';
});

// ===== 6. SEND =====
async function send() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  add('YOU: ' + text, 'user');
  try {
    let reply;
    if (isAgentModeRequest(text)) reply = await runAgent(text);
    else reply = await handleTools(text);
    if (reply === null || reply === undefined) {
      reply = await callGemini(text, pendingImage);
      pendingImage = null;
    }
    add('J.A.R.V.I.S: ' + reply, 'ai');
    speak(reply);
  } catch (e) {
    add('J.A.R.V.I.S: Error — ' + e.message, 'ai');
  }
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
document.getElementById('send-btn')?.addEventListener('click', send);

// ===== 7. VOICE & CLEAR =====
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRec && micBtn) {
  const rec = new SpeechRec();
  rec.lang = 'te-IN';
  rec.onresult = e => { input.value = e.results[0][0].transcript; send(); };
  micBtn.addEventListener('click', () => rec.start());
} else if (micBtn) {
  micBtn.style.display = 'none';
}

clearBtn?.addEventListener('click', () => {
  MEMORY = [];
  localStorage.removeItem('jarvis_memory');
  chat.innerHTML = '';
});
