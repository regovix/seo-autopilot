exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const { keyword, title, siteName = "Madram Milsan AI", siteUrl = "madrammilsanai.regovix.com" } =
      JSON.parse(event.body || "{}");

    if (!keyword || !title) return { statusCode: 400, headers, body: JSON.stringify({ error: "keyword and title required" }) };

    const prompt = "Write a 600-word SEO blog post for " + siteName + " (" + siteUrl + ") a free AI travel planner covering 140 destinations. KEYWORD: " + keyword + " TITLE: " + title + ". Structure: meta description 130 chars, H1 title, intro with keyword, 3 H2 sections with travel tips, one H2 mentioning " + siteName + " naturally with link https://" + siteUrl + ", short conclusion with CTA to try free. Use HTML tags h1 h2 p strong. Warm friendly tone. Respond ONLY with valid JSON, absolutely no markdown fences: {\"metaDescription\":\"...\",\"title\":\"...\",\"content\":\"...HTML...\",\"excerpt\":\"...2 sentences...\",\"tags\":[\"a\",\"b\",\"c\",\"d\",\"e\"]}";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error((data.error && data.error.message) || "API error");

    let raw = data.content[0].text.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const post = JSON.parse(raw);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, post }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
