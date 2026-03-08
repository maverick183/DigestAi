exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { title, description, topic } = JSON.parse(event.body);

  const prompt = `You are a news summarizer for DigestAI. Summarize this news story in 2 simple, clear sentences. 
Write it like you're explaining it to a smart friend — no jargon, no fluff. Be concise and informative.

Topic: ${topic}
Headline: ${title}
Original text: ${description}

Write only the 2-sentence summary. Nothing else.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 120,
        temperature: 0.5,
        messages: [
          { role: "system", content: "You are a concise news summarizer. Always respond with exactly 2 clear sentences." },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Groq API error");
    }

    const summary = data.choices?.[0]?.message?.content || description.slice(0, 150);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary })
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: description.slice(0, 200) + "..." })
    };
  }
};
