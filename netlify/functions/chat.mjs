export default async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      { error: "Only POST requests are allowed." },
      { status: 405 }
    );
  }

  try {
    const { message } = await req.json();

    if (!message || !message.trim()) {
      return Response.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Gemini API key is not configured." },
        { status: 500 }
      );
    }

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const geminiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: "You are Manav AI, a friendly and helpful AI assistant. Give clear, useful answers. You can use simple Hinglish when appropriate."
                }
              ]
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: message
                  }
                ]
              }
            ]
          })
        }
      );

      const data = await geminiResponse.json();

      if (geminiResponse.ok) {
        const reply =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I couldn't generate a response.";

        return Response.json({ reply });
      }

      console.error(`Gemini attempt ${attempt} failed:`, data);

      // Retry only for temporary server/rate-limit errors
      if (
        (geminiResponse.status === 503 ||
          geminiResponse.status === 429) &&
        attempt < maxAttempts
      ) {
        const delay = attempt * 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return Response.json(
        {
          error:
            data?.error?.message ||
            "Gemini API request failed."
        },
        { status: geminiResponse.status }
      );
    }

    return Response.json(
      { error: "Gemini is temporarily unavailable. Please try again." },
      { status: 503 }
    );

  } catch (error) {
    console.error("Function error:", error);

    return Response.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
};
