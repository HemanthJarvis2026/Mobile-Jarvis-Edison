// ===== J.A.R.V.I.S CORE BRAIN & VISION SCRIPT =====

// ===== 1. API KEY & SMART MODELS =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

// Tried in order. If one is busy or unavailable, the next one is used.
// If any name gives a "not found" error, copy the exact ID from Google AI Studio.
const MODELS = [
  "gemini-4-hydrogen",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest"
];

// ===== 2. MEMORY SYSTEM =====
let MEMORY = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
function saveMemory() {
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
}

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');
const clearBtn = document.getElementById('clear-btn');
const camBtn = document.getElementById('cam-btn');
const imgInput = document.getElementById('img-input');

MEMORY.forEach(m =>
  add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai')
);

// ===== 3. GEMINI REQUEST ENGINE (RETRY + FALLBACK) =====
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SERVER_BUSY = [500, 502, 503, 504];

async function generate(contents) {
  let lastErr = new Error('No response from any model.');

  for (const model of MODELS) {
    // Up to 3 tries per model, waiting 1s then 2s between tries
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + API_KEY,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: contents })
          }
        );
        const data = await res.json().catch(() => ({}));

        // Success
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (res.ok && text) return text;

        const msg = data.error?.message || ('Error ' + res.status);
        lastErr = new Error(msg);

        // Bad key or no permission: other models will fail too, so stop now
        if ((res.status === 400 || res.status === 403) && /api key|permission|billing/i.test(msg)) throw lastErr;

        // Server busy (503 etc.): wait and retry the same model
        if (SERVER_BUSY.includes(res.status) || /high demand|temporar|unavailable|overloaded/i.test(msg)) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }

        // Quota (429), model not found (404), blocked or empty reply: go to the next model
        if (res.ok) lastErr = new Error('Empty or blocked response.');
        break;
      } catch (e) {
        lastErr = e;
        if (/api key|permission|billing/i.test(e.message)) throw e;
        await sleep(1000 * 2 ** attempt); // network hiccup: retry
      }
    }
  }

  if (/high demand|temporar|unavailable|overloaded|quota|rate|429|503/i.test(lastErr.message)) {
    throw new Error('All AI models are busy right now. Please try again in a minute.');
  }
  throw lastErr;
}

// ===== TEXT (MEMORY INTEGRATED) =====
async function askGemini(p) {
  const el = add('J.A.R.V.I.S: Thinking...', 'ai');
  try {
    const contents = MEMORY.slice(-12).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    contents.push({ role: 'user', parts: [{ text: p }] });

    const reply = await generate(contents);
    MEMORY.push({ role: 'user', text: p });
    MEMORY.push({ role: 'model', text: reply });
    saveMemory();
    el.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  } catch (e) {
    el.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  }
}

// ===== 4. VISION ENGINE (EYES) =====
if (camBtn && imgInput) {
  camBtn.onclick = () => imgInput.click();
  imgInput.onchange = () => {
    const file = imgInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      const q = input.value.trim() || 'What do you see? Describe briefly.';
      add('YOU: [IMAGE] ' + q, 'user');
      input.value = '';
      askVision(base64, file.type, q);
    };
    reader.readAsDataURL(file);
    imgInput.value = ''; // lets you pick the same image again
  };
}

async function askVision(base64, mime, q) {
  const el = add('J.A.R.V.I.S: Analyzing image...', 'ai');
  try {
    const reply = await generate([
      { parts: [{ text: q }, { inline_data: { mime_type: mime, data: base64 } }] }
    ]);
    el.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  } catch (e) {
    el.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  }
}

// ===== 5. VOICE & UTILS =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR && micBtn) {
  const rec = new SR();
  rec.lang = 'en-US';
  rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    add('YOU: ' + t, 'user');
    askGemini(t);
  };
  micBtn.onclick = () => { rec.start(); micBtn.innerText = 'LISTENING...'; };
  rec.onend = () => { micBtn.innerText = '🎙️'; };
}

let voices = [];
function loadVoices() { voices = speechSynthesis.getVoices(); }
loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(t) {
  const u = new SpeechSynthesisUtterance(t);
  u.rate = 1.05;
  u.pitch = 0.85;
  const v = voices.find(v => v.lang.startsWith('en'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

document.getElementById('send').onclick = () => {
  const t = input.value.trim();
  if (!t) return;
  add('YOU: ' + t, 'user');
  input.value = '';
  askGemini(t);
};

if (clearBtn) {
  clearBtn.onclick = () => {
    MEMORY = [];
    saveMemory();
    chat.innerHTML = '';
    add('SYSTEM: Memory cleared.', 'ai');
  };
}

function add(t, w) {
  const d = document.createElement('div');
  d.className = 'msg ' + w;
  d.innerText = t;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d; // returned so each reply updates its own message
}
