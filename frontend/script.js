

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");

// Check required HTML elements
if (!chat || !input || !sendBtn) {
    console.error("J.A.R.V.I.S ERROR: Required HTML elements not found.");
} else {

    // Send button click
    sendBtn.addEventListener("click", sendMessage);

    // Enter key support
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // Send message function
    function sendMessage() {

        const message = input.value.trim();

        // Prevent empty messages
        if (!message) return;

        // Display user message
        addMessage("YOU: " + message, "user");

        // Clear input
        input.value = "";

        // Disable button while processing
        sendBtn.disabled = true;
        sendBtn.textContent = "PROCESSING...";

        // Display AI processing message
        const aiMessage = addMessage(
            "J.A.R.V.I.S: Processing...",
            "ai"
        );

        // Simulated AI response
        setTimeout(() => {

            try {
                aiMessage.textContent =
                    "J.A.R.V.I.S: Systems online. How may I assist you, Boss?";

            } catch (error) {
                console.error("J.A.R.V.I.S ERROR:", error);
            }

            // Enable button
            sendBtn.disabled = false;
            sendBtn.textContent = "SEND";

            input.focus();

        }, 1000);
    }

    // Add message to chat
    function addMessage(text, who) {

        const messageElement = document.createElement("div");

        messageElement.className = "msg " + who;
        messageElement.textContent = text;

        chat.appendChild(messageElement);

        // Scroll to latest message
        chat.scrollTop = chat.scrollHeight;

        return messageElement;
    }
}
