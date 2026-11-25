
/* ==========================================
   J.A.R.V.I.S GEMINI 3.8 FLASH
   CORE BRAIN + MEMORY + VISION + VOICE
========================================== */

const MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

const API_BASE =
"https://generativelanguage.googleapis.com/v1beta/models/";

let apiKey = sessionStorage.getItem("JARVIS_GEMINI_KEY") || "";

let conversation = [];

try {
    conversation = JSON.parse(
        localStorage.getItem("JARVIS_MEMORY") || "[]"
    );

    if (!Array.isArray(conversation)) conversation = [];
} catch {
    conversation = [];
}

let busy = false;
let listening = false;
let recognition = null;

const $ = id => document.getElementById(id);


/* ==========================================
   CHAT DISPLAY
========================================== */

function addMessage(message, type = "ai") {

    const div = document.createElement("div");

    div.className = "message " + type;
    div.textContent = message;

    $("chat").appendChild(div);

    $("chat").scrollTop = $("chat").scrollHeight;

    return div;
}


/* ==========================================
   MEMORY
========================================== */

function saveMemory() {

    try {
        localStorage.setItem(
            "JARVIS_MEMORY",
            JSON.stringify(conversation)
        );
    } catch (error) {
        console.error("Memory storage error:", error);
    }
}

function restoreMemory() {

    conversation.forEach(item => {

        if (!item || !item.text) return;

        addMessage(
            (item.role === "user" ? "YOU: " : "J.A.R.V.I.S: ") +
            item.text,
            item.role === "user" ? "user" : "ai"
        );
    });
}

restoreMemory();


/* ==========================================
   SYSTEM STATUS
========================================== */

function setStatus(id, text, state) {

    $(id).textContent = text;
    $(id).className = state;
}

function updateNetwork() {

    setStatus(
        "networkStatus",
        navigator.onLine ? "● ONLINE" : "○ OFFLINE",
        navigator.onLine ? "online" : "offline"
    );
}

function updateStatus(connected) {

    setStatus(
        "aiStatus",
        connected ? "● CONNECTED" : "○ API KEY REQUIRED",
        connected ? "online" : "offline"
    );

    setStatus(
        "memoryStatus",
        "● ACTIVE",
        "online"
    );

    setStatus(
        "voiceStatus",
        recognition ? "● READY" : "○ UNSUPPORTED",
        recognition ? "online" : "offline"
    );

    $("coreStatus").textContent =
        connected ? "CORE ACTIVE - ONLINE" : "CORE ACTIVE - DEMO";
}


/* ==========================================
   API POPUP
========================================== */

window.openApiPopup = function() {

    $("keyError").textContent = "";

    $("geminiKey").value = apiKey;

    $("apiOverlay").hidden = false;
};

window.closeApiPopup = function() {

    $("apiOverlay").hidden = true;
};

window.toggleApiVisibility = function() {

    const field = $("geminiKey");

    field.type =
        field.type === "password" ? "text" : "password";

    $("toggleKey").textContent =
        field.type === "password" ? "SHOW" : "HIDE";
};

$("apiOverlay").addEventListener("click", function(event) {

    if (event.target === this) closeApiPopup();

});

document.addEventListener("keydown", function(event) {

    if (event.key === "Escape") closeApiPopup();

});


/* ==========================================
   GEMINI API REQUEST
========================================== */

async function requestGemini(contents) {

    if (!apiKey) {
        throw new Error("Gemini API key is missing.");
    }

    const models = [MODEL, FALLBACK_MODEL];

    let lastError;

    for (const model of models) {

        try {

            console.log("J.A.R.V.I.S Model:", model);

            const response = await fetch(
                API_BASE + model + ":generateContent",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey
                    },

                    body: JSON.stringify({

                        systemInstruction: {
                            parts: [{
                                text:
                                    "You are J.A.R.V.I.S, an intelligent personal AI assistant. " +
                                    "Address the user as Boss when appropriate. " +
                                    "Be accurate, helpful and conversational."
                            }]
                        },

                        contents: contents

                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {

                const message =
                    data.error?.message ||
                    "HTTP " + response.status;

                const error = new Error(message);

                error.status = response.status;

                // Do not retry invalid API keys or malformed requests.
                if (
                    [400, 401, 403].includes(response.status) ||
                    response.status === 404
                ) {
                    throw error;
                }

                lastError = error;
                continue;
            }

            const answer =
                data.candidates?.[0]?.content?.parts
                    ?.filter(p => typeof p.text === "string")
                    .map(p => p.text)
                    .join("\n");

            if (!answer) {

                throw new Error(
                    data.promptFeedback?.blockReason ||
                    "Gemini returned an empty response."
                );
            }

            return answer.trim();

        } catch (error) {

            lastError = error;

            if (
                [400, 401, 403, 404].includes(error.status)
            ) {
                throw error;
            }

            console.error(model, error.message);
        }
    }

    throw lastError || new Error("All Gemini models failed.");
}


/* ==========================================
   CONNECT GEMINI
========================================== */

window.connectGemini = async function() {

    if (busy) return;

    const key = $("geminiKey").value.trim();

    if (!key) {

        $("keyError").textContent =
            "Please enter your Gemini API key.";

        return;
    }

    busy = true;

    $("saveApiKey").disabled = true;
    $("saveApiKey").textContent = "CONNECTING...";

    const oldKey = apiKey;

    apiKey = key;

    try {

        const result = await requestGemini([
            {
                role: "user",
                parts: [{
                    text:
                        "Reply with exactly: J.A.R.V.I.S AI CORE CONNECTED."
                }]
            }
        ]);

        sessionStorage.setItem("JARVIS_GEMINI_KEY", key);

        updateStatus(true);

        closeApiPopup();

        $("geminiKey").value = "";

        addMessage("J.A.R.V.I.S: " + result);

    } catch (error) {

        apiKey = oldKey;

        $("keyError").textContent = error.message;

        console.error("Connection error:", error);

    } finally {

        busy = false;

        $("saveApiKey").disabled = false;
        $("saveApiKey").textContent = "CONNECT AI CORE";
    }
};


/* ==========================================
   CHAT BRAIN
========================================== */

async function processMessage(text, imagePart = null) {

    if (busy) return;

    if (!apiKey) {

        addMessage(
            "Please connect Gemini AI using the glowing core.",
            "error"
        );

        openApiPopup();
        return;
    }

    if (!navigator.onLine) {

        addMessage("Internet connection unavailable.", "error");
        return;
    }

    busy = true;

    $("send").disabled = true;

    const loading = addMessage(
        imagePart
            ? "J.A.R.V.I.S: Analyzing image..."
            : "J.A.R.V.I.S: Thinking, Boss..."
    );

    try {

        const history = conversation.slice(-12).map(item => ({
            role: item.role,
            parts: [{ text: item.text }]
        }));

        const parts = [{ text }];

        if (imagePart) {
            parts.push(imagePart);
        }

        history.push({
            role: "user",
            parts: parts
        });

        const answer = await requestGemini(history);

        loading.textContent = "J.A.R.V.I.S: " + answer;

        conversation.push(
            {
                role: "user",
                text: imagePart
                    ? "[Image attached] " + text
                    : text
            },
            {
                role: "model",
                text: answer
            }
        );

        conversation = conversation.slice(-30);

        saveMemory();

        speak(answer);

        updateStatus(true);

    } catch (error) {

        loading.textContent =
            "J.A.R.V.I.S ERROR: " + error.message;

        loading.classList.add("error");

        console.error("AI error:", error);

    } finally {

        busy = false;

        $("send").disabled = false;
    }
}


/* ==========================================
   SEND MESSAGE
========================================== */

window.sendMessage = function() {

    const text = $("msg").value.trim();

    if (!text || busy) return;

    $("msg").value = "";

    addMessage("YOU: " + text, "user");

    processMessage(text);
};

$("msg").addEventListener("keydown", event => {

    if (event.key === "Enter") {

        event.preventDefault();

        sendMessage();
    }
});


/* ==========================================
   IMAGE UPLOAD + VISION
========================================== */

const camBtn = $("cam-btn");
const imgInput = $("img-input");

if (camBtn && imgInput) {

    camBtn.onclick = () => {

        if (!apiKey) {
            openApiPopup();
            return;
        }

        imgInput.click();
    };

    imgInput.onchange = () => {

        const file = imgInput.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {

            addMessage("Please select a valid image.", "error");
            imgInput.value = "";
            return;
        }

        if (file.size > 15 * 1024 * 1024) {

            addMessage(
                "Image is too large. Please select an image under 15 MB.",
                "error"
            );

            imgInput.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = async () => {

            try {

                const base64 = reader.result.split(",")[1];

                const question =
                    $("msg").value.trim() ||
                    "Describe this image in detail.";

                $("msg").value = "";

                addMessage("YOU: [IMAGE] " + question, "user");

                await processMessage(
                    question,
                    {
                        inline_data: {
                            mime_type: file.type,
                            data: base64
                        }
                    }
                );

            } catch (error) {

                addMessage(
                    "Image error: " + error.message,
                    "error"
                );

            } finally {

                imgInput.value = "";
            }
        };

        reader.onerror = () => {

            addMessage("Unable to read image.", "error");

            imgInput.value = "";
        };

        reader.readAsDataURL(file);
    };
}


/* ==========================================
   TEXT TO SPEECH
========================================== */

function speak(text) {

    if (!("speechSynthesis" in window)) return;

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.lang = "en-IN";
    utterance.rate = 1.05;
    utterance.pitch = 0.9;
    utterance.volume = 1;

    speechSynthesis.speak(utterance);
}


/* ==========================================
   MICROPHONE
========================================== */

const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SR) {

    recognition = new SR();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {

        listening = true;

        $("mic-btn").classList.add("listening");
        $("mic-btn").textContent = "🔴";

        setStatus(
            "voiceStatus",
            "● LISTENING",
            "online"
        );
    };

    recognition.onresult = event => {

        const text =
            event.results[0][0].transcript.trim();

        if (!text) return;

        $("msg").value = text;

        addMessage("YOU: " + text, "user");

        $("msg").value = "";

        processMessage(text);
    };

    recognition.onerror = event => {

        console.error("Microphone error:", event.error);

        addMessage(
            "Microphone error: " + event.error,
            "error"
        );
    };

    recognition.onend = () => {

        listening = false;

        $("mic-btn").classList.remove("listening");
        $("mic-btn").textContent = "🎙️";

        setStatus(
            "voiceStatus",
            apiKey ? "● READY" : "○ LOCKED",
            apiKey ? "online" : "offline"
        );
    };

} else {

    recognition = null;

    $("mic-btn").disabled = true;
}

window.toggleMicrophone = async function() {

    if (!apiKey) {
        openApiPopup();
        return;
    }

    if (!recognition) {

        addMessage(
            "Speech recognition is not supported in this browser.",
            "error"
        );

        return;
    }

    if (busy) return;

    if (listening) {
        recognition.stop();
        return;
    }

    try {

        recognition.start();

    } catch (error) {

        addMessage(
            "Microphone error: " + error.message,
            "error"
        );
    }
};


/* ==========================================
   INITIALIZE
========================================== */

window.addEventListener("online", updateNetwork);
window.addEventListener("offline", updateNetwork);

updateNetwork();

updateStatus(false);

if (apiKey) {

    addMessage(
        "J.A.R.V.I.S: Saved session key detected. Please verify the AI connection."
    );
}

console.log("--------------------------------");
console.log("J.A.R.V.I.S INITIALIZED");
console.log("MODEL:", MODEL);
console.log("VISION: READY");
console.log("MEMORY: READY");
console.log("VOICE:", recognition ? "READY" : "UNSUPPORTED");
console.log("--------------------------------");
