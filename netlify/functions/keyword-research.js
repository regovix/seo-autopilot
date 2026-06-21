exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  try {
    const { topic, niche = "travel", siteUrl = "madrammilsanai.regovix.com" } = JSON.parse(event.body || "{}");
    if (!topic) return { statusCode: 400, headers, body: JSON.stringify({ error: "topic is required" }) };
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: `You are an SEO strategist for ${niche} content. Generate 10 long-tail SEO keywords for: "${topic}" on ${siteUrl}. Focus on low competition, high intent, not dominated by major travel publishers. Respond ONLY with a JSON array, no markdown: [{"keyword":"...","intent":"...","difficulty":"...","rationale":"...","suggestedTitle":"..."}]` }] })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API error");
    let raw = data.content[0].text.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
    const keywords = JSON.parse(raw);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, topic, keywords }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
