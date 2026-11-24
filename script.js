
(function () {
    "use strict";

    // GEMINI 3.8 FLASH
    const MODEL = "gemini-3.8-flash";

    const API_URL =
        "https://generativelanguage.googleapis.com/v1beta/interactions";

    // ELEMENTS
    const chat = document.getElementById("chat");
    const input = document.getElementById("msg");
    const sendBtn = document.getElementById("send");
    const micBtn = document.getElementById("mic-btn");

    const core = document.getElementById("jarvisCore");
    const dialog = document.getElementById("apiDialog");
    const keyInput = document.getElementById("geminiKey");

    const saveBtn = document.getElementById("saveApiKey");
    const closeBtn = document.getElementById("closeApiDialog");

    const apiMessage = document.getElementById("apiMessage");
    const aiStatus = document.getElementById("aiStatus");
    const coreText = document.getElementById("coreText");
    const net = document.getElementById("net");

    let apiKey = "";
    let history = [];
    let recognition = null;
    let isListening = false;

    // CHAT DISPLAY
    function addMessage(message, type) {
        const element = document.createElement("div");
        element.className = "msg " + type;
        element.textContent = message;

        chat.appendChild(element);
        chat.scrollTop = chat.scrollHeight;

        return element;
    }

    // OPEN API POPUP
    function openConfig() {
        if (!dialog.open) {
            apiMessage.textContent = "";
            dialog.showModal();
            keyInput.focus();
        }
    }

    core.addEventListener("click", openConfig);

    core.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openConfig();
        }
    });

    closeBtn.addEventListener("click", function () {
        dialog.close();
    });

    // UPDATE STATUS
    function setActive(active) {
        aiStatus.textContent = active
            ? "● GEMINI ACTIVE"
            : "○ API KEY REQUIRED";

        aiStatus.className = active ? "on" : "off";

        coreText.textContent = active
            ? "GEMINI AI CONNECTED"
            : "CORE ACTIVE - DEMO";
    }

    // GEMINI INTERACTIONS API
    async function callGemini(prompt, key) {
        const response = await fetchWithRetry(API_URL, options); {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": key
            },

            body: JSON.stringify({
                model: MODEL,
                input: prompt,
                store: false
            })
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("Invalid response from Gemini.");
        }

        if (!response.ok) {
            throw new Error(
                "HTTP " + response.status + ": " +
                (data.error?.message || "Gemini request failed.")
            );
        }

        // Read model output
        const answer = (data.output || [])
            .filter(step => step.type === "model_output")
            .flatMap(step => step.content || [])
            .filter(part => part.type === "text")
            .map(part => part.text || "")
            .join("\n")
            .trim();

        if (!answer) {
            throw new Error("Gemini returned no text.");
        }

        return answer;
    }

    // ACTIVATE JARVIS
    saveBtn.addEventListener("click", async function () {
        const enteredKey = keyInput.value.trim();

        if (!enteredKey) {
            apiMessage.textContent = "Please enter your API key.";
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "CONNECTING...";
        apiMessage.textContent = "Verifying Gemini connection...";

        try {
            await callGemini(
                "Reply with exactly: JARVIS CONNECTION SUCCESSFUL",
                enteredKey
            );

            sessionStorage.setItem("GEMINI_API_KEY", enteredKey);

            apiKey = enteredKey;
            history = [];

            setActive(true);
            dialog.close();
            keyInput.value = "";

            addMessage(
                "Gemini successfully connected. " +
                "J.A.R.V.I.S is ready, Boss.",
                "bot"
            );

        } catch (error) {
            console.error(error);
            apiMessage.textContent = error.message;
            setActive(false);

        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "ACTIVATE JARVIS";
        }
    });

    // RESTORE SESSION KEY
    try {
        apiKey = sessionStorage.getItem("GEMINI_API_KEY") || "";
    } catch (error) {
        console.warn(error);
    }

    setActive(Boolean(apiKey));

    // SEND CHAT MESSAGE
    async function sendMessage() {
        const question = input.value.trim();

        if (!question || sendBtn.disabled) return;

        if (!apiKey) {
            addMessage("Please connect Gemini API first, Boss.", "bot");
            openConfig();
            return;
        }

        addMessage(question, "user");
        input.value = "";

        sendBtn.disabled = true;
        sendBtn.textContent = "WAIT...";

        const typing = addMessage(
            "J.A.R.V.I.S is thinking...",
            "bot typing"
        );

        // Include recent conversation context
        const prompt = [
            "You are J.A.R.V.I.S, a helpful personal AI assistant.",
            "Address the user as Boss.",
            "Answer clearly and helpfully.",
            "",
            ...history,
            "User: " + question,
            "J.A.R.V.I.S:"
        ].join("\n");

        try {
            const answer = await callGemini(prompt, apiKey);

            typing.className = "msg bot";
            typing.textContent = answer;

            history.push(
                "User: " + question,
                "J.A.R.V.I.S: " + answer
            );

            if (history.length > 20) {
                history = history.slice(-20);
            }

        } catch (error) {
            typing.className = "msg bot";
            typing.textContent = "Gemini Error: " + error.message;

            console.error(error);

            if (/HTTP (400|401|403)/.test(error.message)) {
                apiKey = "";

                sessionStorage.removeItem("GEMINI_API_KEY");
                setActive(false);
            }

        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = "SEND";
            chat.scrollTop = chat.scrollHeight;
        }
    }

    sendBtn.addEventListener("click", sendMessage);

    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    // MICROPHONE / VOICE RECOGNITION
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        micBtn.title = "Speech recognition is not supported";
    }

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();

        recognition.lang = "en-IN";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = function () {
            isListening = true;
            micBtn.classList.add("listening");
            micBtn.textContent = "🔴";
            coreText.textContent = "LISTENING...";
        };

        recognition.onresult = function (event) {
            const transcript =
                event.results[0][0].transcript;

            input.value = transcript;
            input.focus();

            addMessage("Voice captured: " + transcript, "bot");
        };

        recognition.onerror = function (event) {
            console.error("Microphone error:", event.error);

            if (event.error === "not-allowed") {
                addMessage(
                    "Microphone permission denied. Allow microphone access in Chrome site settings.",
                    "bot"
                );
            } else {
                addMessage(
                    "Voice recognition error: " + event.error,
                    "bot"
                );
            }
        };

        recognition.onend = function () {
            isListening = false;
            micBtn.classList.remove("listening");
            micBtn.textContent = "🎙️";

            coreText.textContent = apiKey
                ? "GEMINI AI CONNECTED"
                : "CORE ACTIVE - DEMO";
        };

        micBtn.addEventListener("click", function () {
            if (isListening) {
                recognition.stop();
                return;
            }

            try {
                recognition.start();
            } catch (error) {
                addMessage(
                    "Unable to start microphone. Please try again.",
                    "bot"
                );
            }
        });
    } else {
        micBtn.addEventListener("click", function () {
            addMessage(
                "Speech recognition is not supported in this browser. Try Google Chrome.",
                "bot"
            );
        });
    }

    // NETWORK STATUS
    function updateNetwork() {
        const online = navigator.onLine;

        net.textContent = online ? "● ONLINE" : "○ OFFLINE";
        net.className = online ? "on" : "off";
    }

    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);

    updateNetwork();

})();
