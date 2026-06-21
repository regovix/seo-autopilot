exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  try {
    const { keyword, title, siteName = "Madram Milsan AI", siteUrl = "madrammilsanai.regovix.com", wordCount = 1200 } = JSON.parse(event.body || "{}");
    if (!keyword || !title) return { statusCode: 400, headers, body: JSON.stringify({ error: "keyword and title required" }) };
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, messages: [{ role: "user", content: `Write a ${wordCount}-word SEO blog post for ${siteName} (${siteUrl}) — a free AI travel planning app covering 140 destinations in 17 languages. KEYWORD: "${keyword}" TITLE: "${title}". Include: meta description 155 chars, H1, intro with keyword in first sentence, 4 H2 sections, one section mentioning ${siteName} naturally with link https://${siteUrl}, FAQ with 3 questions, conclusion with CTA. Use HTML tags h1 h2 p strong ul li. Warm travel writer tone. Respond ONLY with JSON no markdown: {"metaDescription":"...","title":"...","content":"...HTML...","excerpt":"...2 sentences...","tags":["...","...","...","...","..."]}` }] })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API error");
    let raw = data.content[0].text.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
    const post = JSON.parse(raw);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, post }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
