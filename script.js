
async function askGemini(prompt) {

    const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
            model: "gemini-3.8-flash",
            input: prompt
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error?.message || "Gemini API error: " + response.status
        );
    }

    const answer =
        data.output_text ||
        (data.steps || [])
            .filter(step => step.type === "model_output")
            .flatMap(step => step.content || [])
            .filter(item => item.type === "text")
            .map(item => item.text || "")
            .join("");

    if (!answer.trim()) {
        throw new Error("No response received from Gemini.");
    }

    return answer.trim();
}
