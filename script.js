
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#050b14">
<meta name="description" content="J.A.R.V.I.S Mobile AI Assistant">
<title>J.A.R.V.I.S - Mobile Edition</title>

<style>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html, body {
    width: 100%;
    min-height: 100%;
}

body {
    min-height: 100vh;
    min-height: 100dvh;
    background: #050b14;
    color: #7fe9ff;
    font-family: "Courier New", monospace;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: max(16px, env(safe-area-inset-top)) 16px
             max(16px, env(safe-area-inset-bottom));
}

header {
    text-align: center;
}

header h1 {
    font-size: 1.8rem;
    letter-spacing: .25em;
    color: #00d4ff;
    text-shadow: 0 0 12px #00d4ff;
}

header p {
    font-size: .7rem;
    letter-spacing: .4em;
    opacity: .7;
    margin-top: 4px;
}

.core {
    position: relative;
    width: 130px;
    height: 130px;
    flex: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.core:focus-visible {
    outline: 2px solid #00d4ff;
    outline-offset: 8px;
    border-radius: 50%;
}

.ring, .center {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
}

.r1 {
    inset: 0;
    border: 2px dashed #00d4ff;
    animation: spin 8s linear infinite;
}

.r2 {
    inset: 16px;
    border: 2px solid #0a8fb0;
    border-top-color: transparent;
    animation: spin 4s linear infinite reverse;
}

.center {
    inset: 42px;
    background: radial-gradient(circle, #b8f6ff, #00d4ff 60%, #006a85);
    box-shadow: 0 0 25px #00d4ff;
    animation: pulse 2s ease-in-out infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@keyframes pulse {
    50% { transform: scale(.85); opacity: .7; }
}

.core-text {
    font-size: .75rem;
    letter-spacing: .3em;
    color: #00ffa6;
}

.status {
    width: 100%;
    max-width: 480px;
    border: 1px solid #0a4a5e;
    border-radius: 8px;
    padding: 10px 14px;
    background: #08141f;
}

.status h2 {
    font-size: .8rem;
    letter-spacing: .25em;
    margin-bottom: 8px;
    color: #00d4ff;
}

.row {
    display: flex;
    justify-content: space-between;
    font-size: .8rem;
    padding: 3px 0;
    gap: 8px;
}

.on { color: #00ffa6; }
.off { color: #ff6b6b; }

.chat {
    width: 100%;
    max-width: 480px;
    flex: 1;
    min-height: 120px;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid #0a4a5e;
    border-radius: 8px;
    padding: 10px;
    background: #08141f;
    display: flex;
    flex-direction: column;
    gap: 8px;
    scroll-behavior: smooth;
}

.msg {
    max-width: 85%;
    padding: 8px 12px;
    border-radius: 10px;
    font-size: .85rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}

.user {
    align-self: flex-end;
    background: #0a4a5e;
    color: #e8fbff;
}

.bot {
    align-self: flex-start;
    border: 1px solid #00d4ff;
    color: #7fe9ff;
}

.typing {
    opacity: .7;
    font-style: italic;
}

.input-area {
    width: 100%;
    max-width: 480px;
    display: flex;
    gap: 8px;
}

#msg {
    flex: 1;
    min-width: 0;
    padding: 12px;
    background: #08141f;
    border: 1px solid #0a8fb0;
    border-radius: 8px;
    color: #e8fbff;
    font: inherit;
    font-size: 16px;
    outline: none;
}

#msg:focus {
    border-color: #00d4ff;
    box-shadow: 0 0 8px #00d4ff;
}

#send {
    padding: 0 18px;
    background: #00d4ff;
    color: #021018;
    border: 0;
    border-radius: 8px;
    font: inherit;
    font-weight: bold;
    letter-spacing: .1em;
    cursor: pointer;
}

#send:disabled {
    opacity: .5;
    cursor: not-allowed;
}

/* GEMINI API CONFIGURATION POPUP */

#apiDialog {
    width: min(90%, 400px);
    margin: auto;
    padding: 24px;
    background: #08141f;
    color: #7fe9ff;
    border: 2px solid #00d4ff;
    border-radius: 14px;
    font-family: "Courier New", monospace;
    box-shadow: 0 0 25px #007b9a;
}

#apiDialog::backdrop {
    background: rgba(0, 0, 0, .88);
}

#apiDialog h2 {
    color: #00d4ff;
    font-size: 1.1rem;
    letter-spacing: .12em;
    text-align: center;
    margin-bottom: 15px;
}

#apiDialog p {
    font-size: .85rem;
    line-height: 1.5;
    margin-bottom: 12px;
}

#geminiKey {
    width: 100%;
    padding: 13px;
    background: #050b14;
    color: #00eaff;
    border: 1px solid #00d4ff;
    border-radius: 7px;
    font-size: 16px;
    margin-bottom: 12px;
    outline: none;
}

#apiDialog button {
    width: 100%;
    padding: 12px;
    margin-top: 8px;
    background: #00d4ff;
    color: #021018;
    border: 0;
    border-radius: 7px;
    font-family: inherit;
    font-weight: bold;
    cursor: pointer;
}

#apiDialog button:disabled {
    opacity: .5;
}

#closeApiDialog {
    background: #203443 !important;
    color: #7fe9ff !important;
}

#apiMessage {
    margin-top: 12px;
    text-align: center;
    overflow-wrap: anywhere;
}

@media (max-height: 650px) {
    .core {
        width: 90px;
        height: 90px;
    }
    .center { inset: 29px; }
    .r2 { inset: 11px; }
}

@media (prefers-reduced-motion: reduce) {
    .ring, .center { animation: none; }
}
</style>
</head>

<body>

<header>
    <h1>J.A.R.V.I.S</h1>
    <p>MOBILE EDITION</p>
</header>

<!-- CLICK THE CORE TO OPEN API SETTINGS -->

<div class="core"
     id="jarvisCore"
     role="button"
     tabindex="0"
     aria-label="Open Gemini API configuration">
    <div class="ring r1"></div>
    <div class="ring r2"></div>
    <div class="center"></div>
</div>

<p class="core-text" id="coreText">CORE ACTIVE - DEMO</p>

<div class="status">
    <h2>SYSTEM STATUS</h2>

    <div class="row">
        <span>AI CORE</span>
        <b class="off" id="aiStatus">○ API KEY REQUIRED</b>
    </div>

    <div class="row">
        <span>NETWORK</span>
        <b class="on" id="net">● ONLINE</b>
    </div>

    <div class="row">
        <span>VOICE</span>
        <b class="off">○ LOCKED</b>
    </div>

    <div class="row">
        <span>MEMORY</span>
        <b class="off">○ LOCKED</b>
    </div>
</div>

<div class="chat" id="chat" aria-live="polite"></div>

<div class="input-area">
    <input
        id="msg"
        type="text"
        placeholder="Ask J.A.R.V.I.S..."
        autocomplete="off"
        aria-label="Enter your message"
    >
    <button id="send" type="button">SEND</button>
</div>

<!-- GEMINI API KEY POPUP -->

<dialog id="apiDialog">
    <h2>J.A.R.V.I.S CONFIG</h2>

    <p>Enter your Google Gemini API Key to activate your AI assistant.</p>

    <input
        type="password"
        id="geminiKey"
        placeholder="Enter Gemini API Key"
        autocomplete="off"
        spellcheck="false"
    >

    <button type="button" id="saveApiKey">
        ACTIVATE JARVIS
    </button>

    <button type="button" id="closeApiDialog">
        CANCEL
    </button>

    <p id="apiMessage" aria-live="polite"></p>
</dialog>

<script>
(function () {
    "use strict";

    // GEMINI CONFIGURATION

    const MODEL = "gemini-3.8-flash";

    const API_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        MODEL + ":generateContent";

    // HTML ELEMENTS

    const chat = document.getElementById("chat");
    const input = document.getElementById("msg");
    const sendBtn = document.getElementById("send");
    const net = document.getElementById("net");

    const core = document.getElementById("jarvisCore");
    const dialog = document.getElementById("apiDialog");
    const keyInput = document.getElementById("geminiKey");

    const saveBtn = document.getElementById("saveApiKey");
    const closeBtn = document.getElementById("closeApiDialog");

    const apiMessage = document.getElementById("apiMessage");
    const aiStatus = document.getElementById("aiStatus");
    const coreText = document.getElementById("coreText");

    let conversation = [];
    let apiKey = "";

    // DISPLAY CHAT MESSAGES

    function add(text, who) {
        const element = document.createElement("div");

        element.className = "msg " + who;
        element.textContent = text;

        chat.appendChild(element);
        chat.scrollTop = chat.scrollHeight;

        return element;
    }

    // OPEN API CONFIGURATION

    function openConfig() {
        if (!dialog.open) {
            apiMessage.textContent = "";
            dialog.showModal();
            keyInput.focus();
        }
    }

    core.addEventListener("click", openConfig);

    core.addEventListener("keydown", function(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openConfig();
        }
    });

    closeBtn.addEventListener("click", function() {
        dialog.close();
    });

    // UPDATE AI STATUS

    function setActive(active) {
        if (active) {
            aiStatus.textContent = "● GEMINI ACTIVE";
            aiStatus.className = "on";

            coreText.textContent = "GEMINI AI CONNECTED";
        } else {
            aiStatus.textContent = "○ API KEY REQUIRED";
            aiStatus.className = "off";

            coreText.textContent = "CORE ACTIVE - DEMO";
        }
    }

    // CALL GEMINI API

    async function callGemini(contents, key) {

        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": key
            },

            body: JSON.stringify({
                systemInstruction: {
                    parts: [{
                        text:
                            "You are J.A.R.V.I.S, a helpful, intelligent " +
                            "personal AI assistant. Address the user as Boss. " +
                            "Be clear, friendly and informative."
                    }]
                },

                contents: contents,

                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data.error?.message ||
                "Gemini API request failed.";

            throw new Error(
                "HTTP " + response.status + ": " + message
            );
        }

        const answer = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

        if (!answer) {
            throw new Error(
                "Gemini returned no text. Please try another question."
            );
        }

        return answer;
    }

    // SAVE AND VERIFY API KEY

    saveBtn.addEventListener("click", async function() {

        const enteredKey = keyInput.value.trim();

        if (!enteredKey) {
            apiMessage.textContent =
                "Please enter your Gemini API key.";

            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "CONNECTING...";

        apiMessage.textContent = "Testing Gemini connection...";

        try {

            // Verify the API key with a real Gemini request

            const testAnswer = await callGemini(
                [{
                    role: "user",
                    parts: [{
                        text: "Reply with exactly: JARVIS CONNECTION SUCCESSFUL"
                    }]
                }],
                enteredKey
            );

            // Save only after successful verification

            sessionStorage.setItem("GEMINI_API_KEY", enteredKey);

            apiKey = enteredKey;

            conversation = [];

            setActive(true);

            dialog.close();

            keyInput.value = "";

            add(
                "Gemini AI successfully connected. " +
                "J.A.R.V.I.S is now fully operational, Boss.",
                "bot"
            );

        } catch (error) {

            console.error("Gemini connection error:", error);

            apiMessage.textContent = error.message;

            setActive(false);

        } finally {

            saveBtn.disabled = false;
            saveBtn.textContent = "ACTIVATE JARVIS";

        }
    });

    // RESTORE KEY FROM CURRENT BROWSER SESSION

    try {
        apiKey = sessionStorage.getItem("GEMINI_API_KEY") || "";
    } catch (error) {
        console.warn("Session storage is unavailable.", error);
    }

    if (apiKey) {
        setActive(true);
        add(
            "Saved Gemini key detected. You can start chatting, Boss.",
            "bot"
        );
    } else {
        setActive(false);
        add(
            "J.A.R.V.I.S online. Tap the glowing AI CORE to connect Gemini AI, Boss.",
            "bot"
        );
    }

    // SEND MESSAGE TO GEMINI

    async function send() {

        const question = input.value.trim();

        if (!question || sendBtn.disabled) return;

        if (!apiKey) {

            add(
                "Please configure your Gemini API key first, Boss.",
                "bot"
            );

            openConfig();
            return;
        }

        add(question, "user");

        input.value = "";

        sendBtn.disabled = true;
        sendBtn.textContent = "WAIT...";

        const typing = add(
            "J.A.R.V.I.S is thinking...",
            "bot typing"
        );

        // Prepare a temporary conversation history

        const updatedConversation = [
            ...conversation,
            {
                role: "user",
                parts: [{ text: question }]
            }
        ];

        try {

            const answer = await callGemini(
                updatedConversation,
                apiKey
            );

            typing.className = "msg bot";
            typing.textContent = answer;

            // Save successful conversation turns

            conversation = [
                ...updatedConversation,
                {
                    role: "model",
                    parts: [{ text: answer }]
                }
            ];

            // Keep the latest 20 conversation messages

            if (conversation.length > 20) {
                conversation = conversation.slice(-20);
            }

        } catch (error) {

            console.error("J.A.R.V.I.S error:", error);

            typing.className = "msg bot";
            typing.textContent =
                "Gemini API Error: " + error.message;

            // If the key is rejected, request a new one

            if (/HTTP (400|401|403)/.test(error.message)) {
                apiKey = "";

                try {
                    sessionStorage.removeItem("GEMINI_API_KEY");
                } catch (storageError) {
                    console.warn(storageError);
                }

                setActive(false);
            }

        } finally {

            sendBtn.disabled = false;
            sendBtn.textContent = "SEND";

            input.focus();
            chat.scrollTop = chat.scrollHeight;

        }
    }

    // BUTTON AND ENTER KEY

    sendBtn.addEventListener("click", send);

    input.addEventListener("keydown", function(event) {

        if (event.key === "Enter") {
            event.preventDefault();
            send();
        }

    });

    // NETWORK STATUS

    function updateNet() {

        const online = navigator.onLine;

        net.textContent = online ? "● ONLINE" : "○ OFFLINE";
        net.className = online ? "on" : "off";

    }

    window.addEventListener("online", updateNet);
    window.addEventListener("offline", updateNet);

    updateNet();

})();
</script>

</body>
</html>
