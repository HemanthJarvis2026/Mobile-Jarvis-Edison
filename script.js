/* =========================================================
   J.A.R.V.I.S - Mobile Edition  |  script.js
   ========================================================= */

// Models are tried in order. If a name is "not found", copy the exact ID from Google AI Studio.
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"];
const SYSTEM = "You are J.A.R.V.I.S, a helpful personal AI assistant. Address the user respectfully as Boss when appropriate. Give accurate, useful, concise answers.";
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Safe storage helpers ---------- */
function storeGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
  catch { return fallback; }
}
function storeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
}
function loadMemory() {
  try {
    const m = JSON.parse(storeGet("JARVIS_MEMORY", "[]"));
    return Array.isArray(m)
      ? m.filter(x => x && typeof x.text === "string" && (x.role === "user" || x.role === "model"))
      : [];
  } catch { return []; }
}

let apiKey = storeGet("JARVIS_KEY", "");
let memory = loadMemory();
let busy = false, rec = null, listening = false;

const saveMemory = () => storeSet("JARVIS_MEMORY", JSON.stringify(memory.slice(-40)));

/* ---------- UI helpers ---------- */
function add(text, type = "ai") {
  const d = document.createElement("div");
  d.className = "message " + type;
  d.textContent = text;
  $("chat").appendChild(d);
  $("chat").scrollTop = $("chat").scrollHeight;
  return d;
}
function setStatus(id, text, state) { $(id).textContent = text; $(id).className = state; }
function updateStatus(on) {
  setStatus("aiStatus", on ? "● CONNECTED" : "○ API KEY REQUIRED", on ? "online" : "offline");
  setStatus("voiceStatus", !rec ? "○ UNSUPPORTED" : on ? "● READY" : "○ LOCKED", rec && on ? "online" : "offline");
  setStatus("memoryStatus", on ? "● ACTIVE" : "○ LOCKED", on ? "online" : "offline");
  $("coreStatus").textContent = on ? "CORE ACTIVE - ONLINE" : "CORE ACTIVE - DEMO";
}
function updateNetwork() {
  setStatus("networkStatus", navigator.onLine ? "● ONLINE" : "○ OFFLINE", navigator.onLine ? "online" : "offline");
}

/* ---------- API popup ---------- */
window.openApiPopup = () => {
  $("keyError").textContent = "";
  $("apiOverlay").hidden = false;
  setTimeout(() => $("geminiKey").focus(), 150);
};
window.closeApiPopup = () => { $("apiOverlay").hidden = true; };
window.toggleApiVisibility = () => {
  const f = $("geminiKey"), show = f.type === "password";
  f.type = show ? "text" : "password";
  $("toggleKey").textContent = show ? "HIDE" : "SHOW";
};
$("apiOverlay").addEventListener("click", e => { if (e.target === $("apiOverlay")) closeApiPopup(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeApiPopup(); });
$("geminiKey").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); connectGemini(); } });

/* ---------- Gemini engine: retry + model fallback ---------- */
async function generate(contents) {
  let lastErr = new Error("No response from any model.");
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({ system_instruction: { parts: [{ text: SYSTEM }] }, contents })
        });
        const data = await res.json().catch(() => ({}));
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
        if (res.ok && text) return text;

        const msg = data.error?.message || (res.ok ? "Empty or blocked response." : "Error " + res.status);
        lastErr = new Error(msg);
        lastErr.fatal = (res.status === 400 || res.status === 403) && /api key|permission|billing/i.test(msg);
        if (lastErr.fatal) throw lastErr;
        if ([500, 502, 503, 504].includes(res.status) || /high demand|temporar|unavailable|overloaded/i.test(msg)) {
          await sleep(1000 * 2 ** attempt);   // busy: wait, retry same model
          continue;
        }
        break;                                // 404 / 429 / blocked: next model
      } catch (e) {
        if (e.fatal) throw e;                 // bad key: stop immediately
        lastErr = e;
        await sleep(1000 * 2 ** attempt);     // network hiccup: retry
      }
    }
  }
  if (/high demand|temporar|unavailable|overloaded|quota|rate limit|\b429\b|\b503\b/i.test(lastErr.message))
    throw new Error("All AI models are busy right now. Please try again in a minute.");
  throw lastErr;
}

/* ---------- Connect ---------- */
window.connectGemini = async function () {
  const key = $("geminiKey").value.trim();
  if (!key) { $("keyError").textContent = "Please enter your Gemini API key."; return; }
  if (busy) return;
  busy = true;
  const btn = $("saveApiKey"), previous = apiKey;
  btn.disabled = true; btn.textContent = "CONNECTING..."; $("keyError").textContent = "";
  apiKey = key;
  try {
    const result = await generate([{ role: "user", parts: [{ text: "Reply with exactly: J.A.R.V.I.S AI CORE CONNECTED." }] }]);
    storeSet("JARVIS_KEY", key);
    updateStatus(true); closeApiPopup(); $("geminiKey").value = "";
    add("J.A.R.V.I.S: " + result);
  } catch (e) {
    apiKey = previous; $("keyError").textContent = e.message;
  } finally {
    busy = false; btn.disabled = false; btn.textContent = "CONNECT AI CORE";
  }
};

/* ---------- WEATHER ---------- */
const WMO = {
  0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "foggy", 48: "foggy",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 56: "freezing drizzle", 57: "freezing drizzle",
  61: "light rain", 63: "moderate rain", 65: "heavy rain", 66: "freezing rain", 67: "freezing rain",
  71: "light snow", 73: "moderate snow", 75: "heavy snow", 77: "snow grains",
  80: "light rain showers", 81: "rain showers", 82: "violent rain showers",
  85: "snow showers", 86: "heavy snow showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with heavy hail"
};
const compass = d => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(d / 45) % 8];
const hhmm = iso => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location is not supported on this device."));
    navigator.geolocation.getCurrentPosition(
      resolve,
      () => reject(new Error("I need location permission for weather. You can also say: weather in Hyderabad.")),
      { timeout: 10000, maximumAge: 300000 }
    );
  });
}

async function cityName(lat, lon) {
  try {
    const d = await (await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" +
      lat + "&longitude=" + lon + "&localityLanguage=en")).json();
    return d.city || d.locality || d.principalSubdivision || "your location";
  } catch { return "your location"; }
}

// Returns { text, speech }
async function getWeather(text) {
  try {
    let lat, lon, place;

    // "weather in Mumbai" / "what's the weather like in Mumbai today" -> that city; otherwise GPS
    const m = text.match(/weather\b.*?\b(?:in|at|for|of)\s+([\p{L}\s.'-]+?)\s*[?.!]*$/iu);
    let city = m ? m[1].replace(/\s+(today|now|tomorrow|tonight|right now)$/i, "").trim() : "";
    if (/^(today|tomorrow|now|tonight|here|me|my location|my area|right now)?$/i.test(city)) city = "";

    if (city) {
      const g = await (await fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&name=" +
        encodeURIComponent(city))).json();
      if (!g.results?.length) return { text: "I couldn't find a place called " + city + ", Boss." };
      ({ latitude: lat, longitude: lon } = g.results[0]);
      place = g.results[0].name + (g.results[0].country ? ", " + g.results[0].country : "");
    } else {
      const p = await getPosition();
      lat = p.coords.latitude; lon = p.coords.longitude;
      place = await cityName(lat, lon);
    }

    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset" +
      "&timezone=auto&forecast_days=1";
    const d = await (await fetch(url)).json();
    if (!d.current || !d.daily) throw new Error("No data");
    const c = d.current, day = d.daily, u = d.current_units;
    const cond = WMO[c.weather_code] || "unknown";
    const rainChance = day.precipitation_probability_max?.[0];

    const full =
      "Weather in " + place + ", Boss:\n" +
      "Condition: " + cond + "\n" +
      "Temperature: " + c.temperature_2m + u.temperature_2m + " (feels like " + c.apparent_temperature + u.apparent_temperature + ")\n" +
      "Humidity: " + c.relative_humidity_2m + "%\n" +
      "Wind: " + c.wind_speed_10m + " " + u.wind_speed_10m + " " + compass(c.wind_direction_10m) + "\n" +
      "Rain now: " + c.precipitation + " mm | Chance today: " + (rainChance ?? "n/a") + "%\n" +
      "Today: high " + day.temperature_2m_max[0] + "°, low " + day.temperature_2m_min[0] + "°\n" +
      "UV index: " + day.uv_index_max[0] + "\n" +
      "Sunrise " + hhmm(day.sunrise[0]) + " | Sunset " + hhmm(day.sunset[0]);

    const speech =
      "In " + place + " it is " + Math.round(c.temperature_2m) + " degrees with " + cond +
      ", feels like " + Math.round(c.apparent_temperature) + ". Today's high is " + Math.round(day.temperature_2m_max[0]) +
      " and low is " + Math.round(day.temperature_2m_min[0]) +
      (rainChance != null ? ". Chance of rain " + rainChance + " percent" : "") + ", Boss.";

    return { text: full, speech };
  } catch (e) {
    const msg = e.message && e.message !== "No data" ? e.message : "Weather service error.";
    return { text: msg + " Boss." };
  }
}

/* ---------- TOOLS (THE HANDS) ---------- */
// Returns a string or { text, speech } if a tool handled the request, or null to let Gemini answer.
async function handleTools(text) {
  const t = text.toLowerCase();

  // 1. Timer (checked before time so "timer" is never mistaken for a time query)
  const tm = t.match(/(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i);
  if ((t.includes("timer") || t.includes("టైమర్")) && tm) {
    const amount = parseInt(tm[1], 10), unit = tm[2].toLowerCase();
    const factor = /^(hours?|hrs?)/.test(unit) ? 3600000 : /^(seconds?|secs?)/.test(unit) ? 1000 : 60000;
    setTimeout(() => {
      const msg = "టైమర్ పూర్తయింది! " + amount + " " + unit + " అయ్యాయి.";
      add("J.A.R.V.I.S: " + msg);
      speak(msg, "te-IN");
    }, amount * factor);
    return "Timer set for " + amount + " " + unit + ", Boss.";
  }

  // 2. Time
  if (/\b(what(?:'s| is)? the time|what time|current time|time now|tell me the time)\b/.test(t) ||
      t.includes("టైమ్") || t.includes("సమయం"))
    return "The time is " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", Boss.";

  // 3. Weather
  if (t.includes("weather") || t.includes("వాతావరణం"))
    return await getWeather(text);

  // 4. Translate (English to Telugu)
  if (t.includes("translate")) {
    const q = text.replace(/translate (this )?/i, "").trim() || "hello";
    try {
      const d = await (await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q) + "&langpair=en|te")).json();
      return "In Telugu: " + d.responseData.translatedText;
    } catch { return "Translate error, Boss."; }
  }

  // 5. YouTube (only when the message STARTS with play / youtube)
  if (/^\s*(play|youtube)\s+\S/i.test(text)) {
    const q = text.replace(/^\s*(play|youtube( search)?)\s+/i, "").trim();
    if (q) {
      window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(q), "_blank");
      return "Searching YouTube for " + q + ", Boss.";
    }
  }

  return null; // no tool matched, so Gemini answers
}

/* ---------- Chat (with memory) ---------- */
function ready() {
  if (!apiKey) { add("Please connect Gemini AI using the glowing AI CORE.", "error"); openApiPopup(); return false; }
  if (!navigator.onLine) { add("Internet connection unavailable.", "error"); return false; }
  return !busy;
}

window.sendMessage = async function () {
  const text = $("msg").value.trim();
  if (!text || !ready()) return;
  $("msg").value = "";
  add("YOU: " + text, "user");
  const el = add("J.A.R.V.I.S is processing your request, Boss...");
  busy = true; $("send").disabled = true;
  try {
    const tool = await handleTools(text);   // tools first, Gemini second
    if (tool) {
      const reply = typeof tool === "string" ? tool : tool.text;
      const spoken = typeof tool === "string" ? tool : (tool.speech || tool.text);
      el.textContent = reply;
      memory.push({ role: "user", text }, { role: "model", text: reply });
      saveMemory(); speak(spoken);
      return;
    }
    const hist = memory.slice(-12);
    while (hist.length && hist[0].role !== "user") hist.shift();   // Gemini needs the first turn to be "user"
    const contents = hist.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    contents.push({ role: "user", parts: [{ text }] });
    const answer = await generate(contents);
    el.textContent = answer;
    memory.push({ role: "user", text }, { role: "model", text: answer });
    saveMemory(); speak(answer);
  } catch (e) {
    el.textContent = "ERROR: " + e.message; el.classList.add("error");
  } finally {
    busy = false; $("send").disabled = false; $("msg").focus();
  }
};
$("send").onclick = sendMessage;
$("msg").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } });

/* ---------- Vision ---------- */
function shrink(file) {   // resize big phone photos so they upload fast
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1024 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      resolve(c.toDataURL("image/jpeg", .85).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("Could not read that image.")); };
    img.src = src;
  });
}
$("cam-btn").onclick = () => { if (ready()) $("img-input").click(); };
$("img-input").onchange = async () => {
  const file = $("img-input").files[0];
  $("img-input").value = "";
  if (!file || !ready()) return;
  const q = $("msg").value.trim() || "What do you see? Describe briefly.";
  $("msg").value = "";
  add("YOU: [IMAGE] " + q, "user");
  const el = add("J.A.R.V.I.S: Analyzing image...");
  busy = true;
  try {
    const data = await shrink(file);
    const answer = await generate([{ role: "user", parts: [{ text: q }, { inline_data: { mime_type: "image/jpeg", data } }] }]);
    el.textContent = answer; speak(answer);
  } catch (e) {
    el.textContent = "ERROR: " + e.message; el.classList.add("error");
  } finally { busy = false; }
};

/* ---------- Clear memory ---------- */
$("clear-btn").onclick = () => {
  memory = []; saveMemory(); $("chat").innerHTML = "";
  add("SYSTEM: Memory cleared.");
};

/* ---------- Voice ---------- */
function speak(text, lang = "en-IN") {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = 1;
  speechSynthesis.speak(u);
}

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  rec = new SR();
  rec.lang = "en-IN"; rec.continuous = false; rec.interimResults = false;
  rec.onstart = () => {
    listening = true;
    $("mic-btn").classList.add("listening"); $("mic-btn").textContent = "🔴";
    setStatus("voiceStatus", "● LISTENING", "online");
  };
  rec.onresult = e => { $("msg").value = e.results[e.results.length - 1][0].transcript.trim(); sendMessage(); };
  rec.onerror = e => {
    const m = {
      "not-allowed": "Microphone permission denied. Allow microphone access in browser settings.",
      "no-speech": "No speech detected. Please try again.",
      "network": "Speech recognition network error. Check your internet."
    };
    add("J.A.R.V.I.S: " + (m[e.error] || "Microphone error: " + e.error), "error");
  };
  rec.onend = () => {
    listening = false;
    $("mic-btn").classList.remove("listening"); $("mic-btn").textContent = "🎙️";
    updateStatus(!!apiKey);
  };
} else {
  $("mic-btn").disabled = true;
}

$("mic-btn").onclick = () => {
  if (!apiKey) { add("Connect Gemini AI CORE before using voice commands.", "error"); openApiPopup(); return; }
  if (!rec) { add("Speech recognition is not supported in this browser.", "error"); return; }
  if (listening) { rec.stop(); return; }
  if (busy) { add("Please wait for the current AI response.", "error"); return; }
  speechSynthesis.cancel();   // stop J.A.R.V.I.S talking so the mic doesn't hear it
  try { rec.start(); } catch { add("Microphone access failed. Allow microphone permission in site settings.", "error"); }
};

/* ---------- Start ---------- */
window.addEventListener("online", updateNetwork);
window.addEventListener("offline", updateNetwork);
updateNetwork();
updateStatus(!!apiKey);
if (memory.length) {
  $("chat").innerHTML = "";
  memory.forEach(m => add((m.role === "user" ? "YOU: " : "") + m.text, m.role === "user" ? "user" : "ai"));
}
