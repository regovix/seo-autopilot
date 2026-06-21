// netlify/functions/keyword-research.js
// Generates SEO keyword ideas for a given topic using Claude

const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { topic, niche = "travel", siteUrl = "madrammilsanai.regovix.com" } =
      JSON.parse(event.body || "{}");

    if (!topic) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "topic is required" }),
      };
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are an expert SEO strategist specialising in ${niche} content for ${siteUrl}.

Generate 10 SEO keyword ideas for the topic: "${topic}"

For each keyword provide:
- The keyword phrase (4-8 words, long-tail, low competition)
- Search intent (informational / transactional / navigational)
- Estimated difficulty (Low / Medium / High)
- Why it suits ${siteUrl}
- A suggested blog post title using this keyword

Focus on keywords that:
1. Have clear user intent to plan or research travel
2. Are long-tail enough to rank for a newer site
3. Naturally allow mention of AI travel planning tools
4. Are NOT dominated by Lonely Planet / TripAdvisor / Condé Nast

Respond ONLY with a JSON array. No preamble, no markdown, no backticks.
Format:
[
  {
    "keyword": "...",
    "intent": "...",
    "difficulty": "...",
    "rationale": "...",
    "suggestedTitle": "..."
  }
]`,
        },
      ],
    });

    const raw = response.content[0].text.trim();
    const keywords = JSON.parse(raw);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, topic, keywords }),
    };
  } catch (err) {
    console.error("keyword-research error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
