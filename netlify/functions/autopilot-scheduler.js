// netlify/functions/autopilot-scheduler.js
// Scheduled function: runs daily at 8am AEST
// Picks a topic, generates content, publishes to Ghost automatically
// Deploy with: schedule = "0 22 * * *" in netlify.toml (10pm UTC = 8am AEST)

const Anthropic = require("@anthropic-ai/sdk");

// Topic queue — rotates through these automatically
// Add your own destination/topic ideas here
const TOPIC_QUEUE = [
  { topic: "Japan cherry blossom travel", destination: "Japan" },
  { topic: "Norway fjords itinerary", destination: "Norway" },
  { topic: "Bali travel guide for Australians", destination: "Bali" },
  { topic: "Paris travel tips first time", destination: "Paris" },
  { topic: "Maldives budget travel guide", destination: "Maldives" },
  { topic: "Iceland northern lights trip", destination: "Iceland" },
  { topic: "Thailand travel planning", destination: "Thailand" },
  { topic: "New Zealand South Island road trip", destination: "New Zealand" },
  { topic: "Switzerland train travel guide", destination: "Switzerland" },
  { topic: "Morocco travel itinerary", destination: "Morocco" },
  { topic: "Peru Machu Picchu travel guide", destination: "Peru" },
  { topic: "Canada winter travel tips", destination: "Canada" },
  { topic: "Greece island hopping guide", destination: "Greece" },
  { topic: "Vietnam travel itinerary 2 weeks", destination: "Vietnam" },
  { topic: "Portugal travel guide Lisbon Porto", destination: "Portugal" },
];

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const client = new Anthropic();
    const siteUrl = process.env.SITE_URL || "madrammilsanai.regovix.com";
    const siteName = process.env.SITE_NAME || "Madram Milsan AI";

    // Pick today's topic based on day of year (cycles through queue)
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
    );
    const topicObj = TOPIC_QUEUE[dayOfYear % TOPIC_QUEUE.length];

    console.log(`[Autopilot] Today's topic: ${topicObj.topic}`);

    // Step 1: Generate keyword + title
    const kwResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Pick the single best long-tail SEO keyword and blog post title for the topic: "${topicObj.topic}"
The site is ${siteName} (${siteUrl}) — a free AI travel planning app.
Target: low competition, high intent, not dominated by major travel publishers.
Respond ONLY with JSON (no markdown):
{"keyword": "...", "title": "..."}`,
        },
      ],
    });

    const { keyword, title } = JSON.parse(kwResponse.content[0].text.trim());
    console.log(`[Autopilot] Keyword: ${keyword} | Title: ${title}`);

    // Step 2: Generate full blog post
    const contentResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Write a complete 1200-word SEO blog post for ${siteName} (${siteUrl}).

TARGET KEYWORD: "${keyword}"
POST TITLE: "${title}"

Include:
- Meta description (155 chars, include keyword)
- H1 title
- Introduction with keyword in first 100 words
- 4-5 H2 sections with practical travel content
- One section naturally mentioning ${siteName} as a free AI trip planner (no sign-up, 140 destinations, 17 languages, link: https://${siteUrl})
- FAQ section with 3 keyword-variation questions
- Conclusion with CTA

Use HTML tags: <h1> <h2> <p> <strong> <ul> <li>
Tone: warm, practical travel writer. Not salesy.

Respond ONLY with JSON (no markdown backticks):
{
  "metaDescription": "...",
  "title": "...",
  "content": "...full HTML...",
  "excerpt": "...2 sentence summary...",
  "tags": ["...", "...", "...", "...", "..."]
}`,
        },
      ],
    });

    const post = JSON.parse(contentResponse.content[0].text.trim());
    console.log(`[Autopilot] Content generated: ${post.title}`);

    // Step 3: Publish to Ghost if configured
    let publishResult = { mode: "preview", message: "Ghost not configured" };

    const GHOST_URL = process.env.GHOST_URL;
    const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY;

    if (GHOST_URL && GHOST_ADMIN_API_KEY) {
      const [id, secret] = GHOST_ADMIN_API_KEY.split(":");
      const jwt = generateGhostJWT(id, secret);

      const ghostPost = {
        title: post.title,
        html: post.content,
        custom_excerpt: post.excerpt,
        meta_description: post.metaDescription,
        tags: (post.tags || []).map((t) => ({ name: t })),
        status: "published",
        published_at: new Date().toISOString(),
      };

      const res = await fetch(`${GHOST_URL}/ghost/api/admin/posts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Ghost ${jwt}`,
        },
        body: JSON.stringify({ posts: [ghostPost] }),
      });

      if (res.ok) {
        const data = await res.json();
        publishResult = {
          mode: "published",
          postId: data.posts[0].id,
          postUrl: data.posts[0].url,
        };
        console.log(`[Autopilot] Published: ${data.posts[0].url}`);
      } else {
        publishResult = { mode: "error", error: await res.text() };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        topic: topicObj.topic,
        keyword,
        title,
        publishResult,
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (err) {
    console.error("[Autopilot] Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function generateGhostJWT(id, secret) {
  const crypto = require("crypto");
  const now = Math.floor(Date.now() / 1000);
  const b64 = (s) =>
    Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const payload = b64(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
  const sig = crypto
    .createHmac("sha256", Buffer.from(secret, "hex"))
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${header}.${payload}.${sig}`;
}
