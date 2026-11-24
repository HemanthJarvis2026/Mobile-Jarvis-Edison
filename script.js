
(function () {
    "use strict";

    // =====================================
    // GEMINI API CONFIGURATION
    // =====================================

    const MODEL = "gemini-3.8-flash";

    const API_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        MODEL + ":generateContent";

    // =====================================
    // HTML ELEMENTS
    // =====================================

    const chat = document.getElementById("chat");
    const input = document.getElementById("msg");
    const sendBtn = document.getElementById("send");

    const core = document.getElementById("jarvisCore");
    const dialog = document.getElementById("apiDialog");

    const keyInput = document.getElementById("geminiKey");

    const saveBtn = document.getElementById("saveApiKey");
    const closeBtn = document.getElementById("closeApiDialog");

    const apiMessage = document.getElementById("apiMessage");
    const aiStatus = document.getElementById("aiStatus");

    const coreText = document.getElementById("coreText");
    const net = document.getElementById("net");

    // =====================================
    // VARIABLES
    // =====================================

    let apiKey = "";
    let conversation = [];

    // =====================================
    // DISPLAY CHAT MESSAGES
    // =====================================

    function addMessage(message, type) {

        const element = document.createElement("div");

        element.className = "msg " + type;
        element.textContent = message;

        chat.appendChild(element);

        chat.scrollTop = chat.scrollHeight;

        return element;
    }

    // =====================================
    // OPEN GEMINI CONFIGURATION
    // =====================================

    function openConfig() {

        if (!dialog.open) {

            apiMessage.textContent = "";

            keyInput.value = "";

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

    // =====================================
    // UPDATE SYSTEM STATUS
    // =====================================

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

    // =====================================
    // GEMINI API REQUEST
    // =====================================

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
                            "You are J.A.R.V.I.S, an intelligent " +
                            "personal AI assistant. Address the user " +
                            "as Boss. Be helpful, clear and informative."
                    }]
                },

                contents: contents,

                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024
                }
            })
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("Invalid response received from Gemini.");
        }

        if (!response.ok) {

            const message =
                data.error?.message ||
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

            const reason =
                data.promptFeedback?.blockReason ||
                data.candidates?.[0]?.finishReason ||
                "No text returned";

            throw new Error(
                "Gemini returned no text. Reason: " + reason
            );
        }

        return answer;
    }

    // =====================================
    // ACTIVATE JARVIS / VERIFY API KEY
    // =====================================

    saveBtn.addEventListener("click", async function () {

        const enteredKey = keyInput.value.trim();

        if (!enteredKey) {

            apiMessage.textContent =
                "Please enter your Gemini API key.";

            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "CONNECTING...";

        apiMessage.textContent =
            "Testing Gemini API connection...";

        try {

            const testAnswer = await callGemini(
                [{
                    role: "user",
                    parts: [{
                        text: "Reply with exactly: JARVIS CONNECTION SUCCESSFUL"
                    }]
                }],
                enteredKey
            );

            // Store key only after successful verification

            sessionStorage.setItem(
                "GEMINI_API_KEY",
                enteredKey
            );

            apiKey = enteredKey;

            conversation = [];

            setActive(true);

            dialog.close();

            keyInput.value = "";

            addMessage(
                "Gemini AI successfully connected. " +
                "J.A.R.V.I.S is fully operational, Boss.",
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

    // =====================================
    // RESTORE API KEY FROM SESSION
    // =====================================

    try {

        apiKey =
            sessionStorage.getItem("GEMINI_API_KEY") || "";

    } catch (error) {

        console.warn("Session storage unavailable.", error);

    }

    if (apiKey) {

        setActive(true);

        addMessage(
            "Saved Gemini key detected. Welcome back, Boss.",
            "bot"
        );

    } else {

        setActive(false);

    }

    // =====================================
    // SEND MESSAGE TO GEMINI
    // =====================================

    async function sendMessage() {

        const question = input.value.trim();

        if (!question || sendBtn.disabled) {
            return;
        }

        if (!apiKey) {

            addMessage(
                "Please configure your Gemini API key first, Boss.",
                "bot"
            );

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

            // Save successful conversation history

            conversation = [
                ...updatedConversation,
                {
                    role: "model",
                    parts: [{ text: answer }]
                }
            ];

            // Keep latest 20 messages

            if (conversation.length > 20) {

                conversation = conversation.slice(-20);

            }

        } catch (error) {

            console.error("JARVIS error:", error);

            typing.className = "msg bot";

            typing.textContent =
                "Gemini API Error: " + error.message;

            // Reset key if authentication fails

            if (/HTTP (400|401|403)/.test(error.message)) {

                apiKey = "";

                try {

                    sessionStorage.removeItem("GEMINI_API_KEY");

                } catch (storageError) {

                    console.warn(storageError);

                }

                setActive(false);

                addMessage(
                    "Please check your API key and reconnect.",
                    "bot"
                );
            }

        } finally {

            sendBtn.disabled = false;

            sendBtn.textContent = "SEND";

            input.focus();

            chat.scrollTop = chat.scrollHeight;

        }
    }

    // =====================================
    // SEND BUTTON
    // =====================================

    sendBtn.addEventListener("click", sendMessage);

    // ENTER KEY SUPPORT

    input.addEventListener("keydown", function (event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();

        }

    });

    // =====================================
    // NETWORK STATUS
    // =====================================

    function updateNetwork() {

        const online = navigator.onLine;

        net.textContent = online
            ? "● ONLINE"
            : "○ OFFLINE";

        net.className = online ? "on" : "off";

    }

    window.addEventListener("online", updateNetwork);

    window.addEventListener("offline", updateNetwork);

    updateNetwork();

})();
