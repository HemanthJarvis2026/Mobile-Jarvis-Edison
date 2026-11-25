
// ======================================================
// J.A.R.V.I.S CORE BRAIN & VISION ENGINE
// VERSION: 3.8-FLASH
// ======================================================

// ===== 1. API KEY MANAGEMENT =====

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY && API_KEY.trim()) {
        API_KEY = API_KEY.trim();
        localStorage.setItem("jarvis_key", API_KEY);
    }
}

// ===== 2. GEMINI MODEL CONFIGURATION =====

const MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite"
];

const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/";

// ===== 3. MEMORY SYSTEM =====

let MEMORY = [];

try {
    MEMORY = JSON.parse(
        localStorage.getItem("jarvis_memory") || "[]"
    );

    if (!Array.isArray(MEMORY)) MEMORY = [];

} catch (e) {
    MEMORY = [];
}

function saveMemory() {
    localStorage.setItem(
        "jarvis_memory",
        JSON.stringify(MEMORY)
    );
}

// ===== 4. DOM ELEMENTS =====

const chat = document.getElementById("chat");
const input = document.getElementById("msg");

const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");

const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");

const sendBtn = document.getElementById("send");

// ===== 5. RESTORE CHAT MEMORY =====

function add(text, type) {
    if (!chat) return null;

    const div = document.createElement("div");

    div.className = "msg " + type;
    div.innerText = text;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    return div;
}

if (chat) {
    MEMORY.forEach(m => {
        if (!m || !m.text) return;

        add(
            (m.role === "user" ? "YOU: " : "J.A.R.V.I.S: ") + m.text,
            m.role === "user" ? "user" : "ai"
        );
    });
}

// ===== 6. API ERROR HANDLING =====

function shouldRetry(message) {
    return /high demand|temporar|quota|rate limit|503|502|500|429|unavailable|overloaded|internal error/i
        .test(message);
}

async function requestGemini(model, payload) {

    if (!API_KEY) {
        throw new Error(
            "Gemini API key missing. Refresh and enter your API key."
        );
    }

    const response = await fetch(
        API_URL + model + ":generateContent?key=" + encodeURIComponent(API_KEY),
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(payload)
        }
    );

    const data = await response.json();

    if (!response.ok || data.error) {

        const message =
            data.error?.message ||
            "Gemini API request failed: HTTP " + response.status;

        const error = new Error(message);

        error.status = response.status;

        throw error;
    }

    const reply =
        data.candidates?.[0]?.content?.parts
            ?.filter(part => typeof part.text === "string")
            .map(part => part.text)
            .join("\n");

    if (!reply) {
        throw new Error(
            data.promptFeedback?.blockReason
                ? "Request blocked: " + data.promptFeedback.blockReason
                : "Gemini returned an empty response."
        );
    }

    return reply;
}

// ===== 7. GEMINI 3.8 BRAIN =====

async function callGemini(promptText) {

    const history = MEMORY.slice(-12)
        .filter(m =>
            m &&
            (m.role === "user" || m.role === "model") &&
            typeof m.text === "string" &&
            m.text.trim()
        )
        .map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

    const contents = [
        ...history,
        {
            role: "user",
            parts: [{ text: promptText }]
        }
    ];

    let lastError;

    for (const model of MODELS) {

        try {

            console.log("J.A.R.V.I.S using:", model);

            const reply = await requestGemini(model, {
                contents: contents
            });

            console.log("Gemini response received:", model);

            return reply;

        } catch (error) {

            lastError = error;

            console.error(
                "Model failed:",
                model,
                error.message
            );

            // Retry only temporary service errors.
            if (!shouldRetry(error.message)) {
                throw error;
            }
        }
    }

    throw lastError ||
        new Error("All Gemini models are unavailable.");
}

// ===== 8. CHAT ENGINE =====

async function askGemini(promptText) {

    const thinking = add(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );

    try {

        const reply = await callGemini(promptText);

        MEMORY.push({
            role: "user",
            text: promptText
        });

        MEMORY.push({
            role: "model",
            text: reply
        });

        saveMemory();

        if (thinking) {
            thinking.innerText = "J.A.R.V.I.S: " + reply;
        }

        speak(reply);

    } catch (error) {

        console.error("JARVIS ERROR:", error);

        if (thinking) {
            thinking.innerText =
                "J.A.R.V.I.S: ERROR - " + error.message;
        }
    }
}

// ===== 9. VISION ENGINE =====

if (camBtn && imgInput) {

    camBtn.onclick = () => {
        imgInput.click();
    };

    imgInput.onchange = () => {

        const file = imgInput.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            add(
                "SYSTEM: Please select a valid image.",
                "ai"
            );
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {

            const base64 = reader.result.split(",")[1];

            const question =
                input?.value.trim() ||
                "What do you see? Describe the image in detail.";

            add("YOU: [IMAGE] " + question, "user");

            if (input) input.value = "";

            askVision(base64, file.type, question);
        };

        reader.onerror = () => {
            add("SYSTEM: Unable to read image.", "ai");
        };

        reader.readAsDataURL(file);
    };
}

// ===== 10. GEMINI 3.8 IMAGE ANALYSIS =====

async function askVision(base64, mime, question) {

    const thinking = add(
        "J.A.R.V.I.S: Analyzing image...",
        "ai"
    );

    try {

        const payload = {
            contents: [
                {
                    role: "user",

                    parts: [
                        {
                            text: question
                        },
                        {
                            inline_data: {
                                mime_type: mime,
                                data: base64
                            }
                        }
                    ]
                }
            ]
        };

        let reply;
        let lastError;

        for (const model of MODELS) {

            try {

                console.log(
                    "J.A.R.V.I.S Vision Model:",
                    model
                );

                reply = await requestGemini(
                    model,
                    payload
                );

                break;

            } catch (error) {

                lastError = error;

                if (!shouldRetry(error.message)) {
                    throw error;
                }
            }
        }

        if (!reply) {
            throw lastError ||
                new Error("Vision models unavailable.");
        }

        MEMORY.push({
            role: "user",
            text: "[Image attached] " + question
        });

        MEMORY.push({
            role: "model",
            text: reply
        });

        saveMemory();

        if (thinking) {
            thinking.innerText = "J.A.R.V.I.S: " + reply;
        }

        speak(reply);

    } catch (error) {

        console.error("VISION ERROR:", error);

        if (thinking) {
            thinking.innerText =
                "J.A.R.V.I.S: VISION ERROR - " + error.message;
        }
    }
}

// ===== 11. VOICE RECOGNITION =====

const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SR && micBtn) {

    const rec = new SR();

    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;

    let listening = false;

    rec.onstart = () => {
        listening = true;
        micBtn.innerText = "LISTENING...";
    };

    rec.onresult = (event) => {

        const transcript =
            event.results[0][0].transcript.trim();

        if (!transcript) return;

        add("YOU: " + transcript, "user");

        askGemini(transcript);
    };

    rec.onerror = (event) => {

        console.error(
            "MIC ERROR:",
            event.error
        );

        add(
            "SYSTEM: Microphone error - " + event.error,
            "ai"
        );
    };

    rec.onend = () => {
        listening = false;
        micBtn.innerText = "🎙️";
    };

    micBtn.onclick = () => {

        if (listening) return;

        try {
            rec.start();
        } catch (error) {
            console.error(error);
            micBtn.innerText = "🎙️";
        }
    };

} else if (micBtn) {

    micBtn.onclick = () => {
        add(
            "SYSTEM: Speech recognition is not supported in this browser.",
            "ai"
        );
    };
}

// ===== 12. TEXT TO SPEECH =====

let voices = [];

function loadVoices() {
    voices = window.speechSynthesis
        ? speechSynthesis.getVoices()
        : [];
}

if ("speechSynthesis" in window) {

    loadVoices();

    speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {

    if (!("speechSynthesis" in window)) return;

    if (!text) return;

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;
    utterance.pitch = 0.85;
    utterance.volume = 1;

    const voice = voices.find(v =>
        v.lang.toLowerCase().startsWith("en")
    );

    if (voice) {
        utterance.voice = voice;
    }

    speechSynthesis.speak(utterance);
}

// ===== 13. SEND MESSAGE =====

if (sendBtn && input) {

    sendBtn.onclick = () => {

        const message = input.value.trim();

        if (!message) return;

        add("YOU: " + message, "user");

        input.value = "";

        askGemini(message);
    };

    input.addEventListener("keydown", event => {

        if (event.key === "Enter" && !event.shiftKey) {

            event.preventDefault();

            sendBtn.click();
        }
    });
}

// ===== 14. CLEAR MEMORY =====

if (clearBtn) {

    clearBtn.onclick = () => {

        MEMORY = [];

        saveMemory();

        if (chat) {
            chat.innerHTML = "";
        }

        add(
            "SYSTEM: Memory cleared successfully.",
            "ai"
        );

        if ("speechSynthesis" in window) {
            speechSynthesis.cancel();
        }
    };
}

// ===== 15. SYSTEM STATUS =====

console.log("--------------------------------");
console.log("J.A.R.V.I.S CORE INITIALIZED");
console.log("VERSION: 3.8-FLASH");
console.log("PRIMARY MODEL: gemini-3.8-flash");
console.log("VISION ENGINE: ENABLED");
console.log("VOICE ENGINE: ENABLED");
console.log("MEMORY SYSTEM: ENABLED");
console.log("--------------------------------");

add(
    "J.A.R.V.I.S: Systems online. Gemini 3.8 Flash ready.",
    "ai"
);
