// netlify/functions/generate-content.js
// Generates a full SEO-optimised blog post using Claude

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
    const {
      keyword,
      title,
      niche = "travel",
      siteUrl = "madrammilsanai.regovix.com",
      siteName = "Madram Milsan AI",
      wordCount = 1200,
    } = JSON.parse(event.body || "{}");

    if (!keyword || !title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "keyword and title are required" }),
      };
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are a professional travel content writer for ${siteName} (${siteUrl}) — a free AI-powered travel planning app covering 140 destinations across 80+ countries in 17 languages.

Write a complete, ${wordCount}-word SEO blog post with:

TARGET KEYWORD: "${keyword}"
POST TITLE: "${title}"

STRUCTURE REQUIRED:
1. Meta description (155 chars max, include keyword, include a benefit)
2. H1 (the post title)
3. Introduction (150 words, hook in first sentence, include keyword naturally)
4. H2: [First main section relevant to topic]
5. H2: [Second main section]  
6. H2: How AI Makes [topic] Planning Effortless
   - This section naturally introduces ${siteName} as a solution
   - Mention: free, no sign-up, covers 140 destinations, 17 languages
   - Include this link: https://${siteUrl}
7. H2: [Practical tips section]
8. H2: Frequently Asked Questions
   - 3 FAQs in Q&A format using long-tail keyword variations
9. Conclusion with CTA to try ${siteName} free

SEO REQUIREMENTS:
- Use the exact keyword "${keyword}" in: title, first paragraph, one H2, meta description, conclusion
- Use keyword variations naturally every 200-300 words
- Include 2-3 internal anchor text suggestions like [link text](URL placeholder)
- Bold 3-4 key facts or statistics
- Write at a Grade 8 reading level — clear, engaging, not academic

TONE: Enthusiastic travel writer who has personally experienced the destination. 
Warm, practical, trustworthy. Not salesy. The ${siteName} mention should feel natural, not like an ad.

Respond ONLY with a JSON object. No markdown code fences. No preamble.
Format:
{
  "metaDescription": "...",
  "title": "...",
  "content": "... full HTML content using <h1>, <h2>, <p>, <strong>, <ul>, <li> tags ...",
  "wordCount": 1200,
  "keyword": "...",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "excerpt": "... 2 sentence summary for blog listing page ..."
}`,
        },
      ],
    });

    const raw = response.content[0].text.trim();
    const post = JSON.parse(raw);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, post }),
    };
  } catch (err) {
    console.error("generate-content error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
