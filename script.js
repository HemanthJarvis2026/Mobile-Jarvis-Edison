
const $ = (id) => document.getElementById(id);

const core = $("jarvisCore");
const dialog = $("apiDialog");
const keyInput = $("geminiKey");
const saveButton = $("saveApiKey");
const closeButton = $("closeDialog");
const toggleButton = $("toggleKey");
const keyError = $("keyError");

const chat = $("chat");
const messageInput = $("msg");
const sendButton = $("send");
const micButton = $("mic-btn");

const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODEL = "gemini-3.8-flash";

let apiKey = sessionStorage.getItem("GEMINI_API_KEY") || "";
let conversation = [];
let recognition = null;
let isListening = false;
let busy = false;

/* ---------------------------
   CHAT DISPLAY
---------------------------- */

function addMessage(message, type = "ai") {
  const div = document.createElement("div");

  div.className = "message " + type;
  div.textContent = message;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  return div;
}

/* ---------------------------
   STATUS UPDATE
---------------------------- */

function setStatus(id, message, state) {
  const element = $(id);
  element.textContent = message;
  element.className = state;
}

function updateStatus(connected) {
  if (connected) {
    setStatus("aiStatus", "● CONNECTED", "online");
    setStatus("voiceStatus", "● READY", "online");
    setStatus("memoryStatus", "● ACTIVE", "online");
    $("coreStatus").textContent = "CORE ACTIVE - ONLINE";
  } else {
    setStatus("aiStatus", "○ API KEY REQUIRED", "offline");
    setStatus("voiceStatus", "○ LOCKED", "offline");
    setStatus("memoryStatus", "○ LOCKED", "offline");
    $("coreStatus").textContent = "CORE ACTIVE - DEMO";
  }
}

/* ---------------------------
   AI CORE CLICK
---------------------------- */

core.addEventListener("click", () => {
  keyError.textContent = "";

  if (apiKey) {
    addMessage("J.A.R.V.I.S: Gemini AI is connected, Boss.");
    return;
  }

  keyInput.value = "";

  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    alert("Your browser does not support the API configuration dialog.");
  }

  setTimeout(() => keyInput.focus(), 100);
});

/* ---------------------------
   SHOW / HIDE API KEY
---------------------------- */

toggleButton.addEventListener("click", () => {
  const hidden = keyInput.type === "password";

  keyInput.type = hidden ? "text" : "password";
  toggleButton.textContent = hidden ? "HIDE" : "SHOW";
});

/* ---------------------------
   CLOSE POPUP
---------------------------- */

closeButton.addEventListener("click", () => {
  dialog.close();
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    dialog.close();
  }
});

/* ---------------------------
   GEMINI API REQUEST
---------------------------- */

async function callGemini(prompt) {
  const response = await fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },

    body: JSON.stringify({
      model: MODEL,
      input: prompt
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.error?.message ||
      data.message ||
      `Gemini API error: HTTP ${response.status}`;

    throw new Error(message);
  }

  // Extract text from the Interactions API response.
  const textParts = [];

  if (data.output_text) {
    textParts.push(data.output_text);
  } else {
    for (const step of data.steps || []) {
      if (step.type === "model_output") {
        for (const item of step.content || []) {
          if (item.type === "text" && item.text) {
            textParts.push(item.text);
          }
        }
      }
    }
  }

  const answer = textParts.join("\n").trim();

  if (!answer) {
    throw new Error("Gemini returned an empty response.");
  }

  return answer;
}

/* ---------------------------
   CONNECT AND VERIFY API KEY
---------------------------- */

saveButton.addEventListener("click", connectGemini);

keyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    connectGemini();
  }
});

async function connectGemini() {
  const enteredKey = keyInput.value.trim();

  if (!enteredKey) {
    keyError.textContent = "Please enter your Gemini API key.";
    keyInput.focus();
    return;
  }

  if (busy) return;

  busy = true;
  saveButton.disabled = true;
  saveButton.textContent = "CONNECTING...";
  keyError.textContent = "";

  const previousKey = apiKey;
  apiKey = enteredKey;

  try {
    const result = await callGemini(
      "Reply with exactly: J.A.R.V.I.S AI CORE CONNECTED."
    );

    sessionStorage.setItem("GEMINI_API_KEY", enteredKey);

    conversation = [];

    updateStatus(true);
    dialog.close();

    addMessage("J.A.R.V.I.S: " + result);

  } catch (error) {
    apiKey = previousKey;

    keyError.textContent = error.message;
    console.error("Gemini connection error:", error);

  } finally {
    busy = false;
    saveButton.disabled = false;
    saveButton.textContent = "CONNECT AI CORE";
  }
}

/* ---------------------------
   SEND MESSAGE TO GEMINI
---------------------------- */

async function sendMessage() {
  const text = messageInput.value.trim();

  if (!text || busy) return;

  if (!apiKey) {
    addMessage("Please connect your Gemini API key using the glowing AI CORE.", "error-message");
    return;
  }

  messageInput.value = "";

  addMessage("YOU: " + text, "user");

  const loading = addMessage("J.A.R.V.I.S is thinking, Boss...");

  busy = true;
  sendButton.disabled = true;

  try {
    const recentHistory = conversation.slice(-10);

    const prompt = [
      "You are J.A.R.V.I.S, a helpful AI assistant.",
      "Address the user respectfully as Boss when appropriate.",
      "Give clear and accurate answers.",
      "",
      ...recentHistory.map(item =>
        (item.role === "user" ? "User: " : "J.A.R.V.I.S: ") + item.text
      ),
      "User: " + text,
      "J.A.R.V.I.S:"
    ].join("\n");

    const answer = await callGemini(prompt);

    loading.textContent = answer;

    conversation.push(
      { role: "user", text },
      { role: "assistant", text: answer }
    );

    if (conversation.length > 20) {
      conversation = conversation.slice(-20);
    }

    speak(answer);

  } catch (error) {
    loading.textContent = "ERROR: " + error.message;
    loading.classList.add("error-message");

    console.error("Gemini error:", error);

  } finally {
    busy = false;
    sendButton.disabled = false;
    messageInput.focus();
  }
}

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

/* ---------------------------
   TEXT TO SPEECH
---------------------------- */

function speak(text) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "en-IN";
  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}

/* ---------------------------
   MICROPHONE / SPEECH RECOGNITION
---------------------------- */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();

  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    micButton.classList.add("listening");
    micButton.textContent = "🔴";

    setStatus("voiceStatus", "● LISTENING", "online");
    addMessage("J.A.R.V.I.S: Listening, Boss...");
  };

  recognition.onresult = (event) => {
    const transcript =
      event.results[event.results.length - 1][0].transcript.trim();

    messageInput.value = transcript;

    addMessage("YOU (VOICE): " + transcript, "user");

    // Automatically send recognized speech to Gemini.
    sendMessage();
  };

  recognition.onerror = (event) => {
    console.error("Microphone error:", event.error);

    let message = "Microphone error: " + event.error;

    if (event.error === "not-allowed") {
      message = "Microphone permission denied. Allow microphone access in Chrome settings.";
    } else if (event.error === "no-speech") {
      message = "No speech detected. Please try again.";
    } else if (event.error === "network") {
      message = "Speech recognition network error. Check your internet connection.";
    }

    addMessage("J.A.R.V.I.S: " + message, "error-message");
  };

  recognition.onend = () => {
    isListening = false;
    micButton.classList.remove("listening");
    micButton.textContent = "🎙️";

    setStatus(
      "voiceStatus",
      apiKey ? "● READY" : "○ LOCKED",
      apiKey ? "online" : "offline"
    );
  };

} else {
  micButton.disabled = true;
  micButton.title = "Speech recognition is not supported by this browser";
  addMessage("Speech recognition is not supported in this browser.", "error-message");
}

/* ---------------------------
   MICROPHONE BUTTON
---------------------------- */

micButton.addEventListener("click", async () => {
  if (!apiKey) {
    addMessage("Connect Gemini AI CORE before using voice commands.", "error-message");
    return;
  }

  if (!recognition) {
    addMessage("Your browser does not support speech recognition.", "error-message");
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  if (!navigator.onLine) {
    addMessage("Please check your internet connection.", "error-message");
    return;
  }

  try {
    if (navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      stream.getTracks().forEach(track => track.stop());
    }

    recognition.start();

  } catch (error) {
    console.error("Microphone permission error:", error);

    addMessage(
      "Microphone unavailable. Allow microphone permission for this website and try again.",
      "error-message"
    );
  }
});

/* ---------------------------
   NETWORK STATUS
---------------------------- */

function updateNetwork() {
  setStatus(
    "networkStatus",
    navigator.onLine ? "● ONLINE" : "○ OFFLINE",
    navigator.onLine ? "online" : "offline"
  );
}

window.addEventListener("online", updateNetwork);
window.addEventListener("offline", updateNetwork);

/* ---------------------------
   INITIALIZE J.A.R.V.I.S
---------------------------- */

updateStatus(Boolean(apiKey));
updateNetwork();

if (apiKey) {
  addMessage("J.A.R.V.I.S: Previous browser session key detected. Ready to connect.");
}

console.log("J.A.R.V.I.S Mobile Edition initialized.");
