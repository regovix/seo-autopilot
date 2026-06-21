// netlify/functions/autopilot-scheduler.js
const TOPICS = [
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

async function callClaude(prompt, maxTokens = 600) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "API error");
  let text = data.content[0].text.trim();
  text = text.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
  return text;
}

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  try {
    const siteUrl = process.env.SITE_URL || "madrammilsanai.regovix.com";
    const siteName = process.env.SITE_NAME || "Madram Milsan AI";
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / 86400000);
    const topicObj = TOPICS[dayOfYear % TOPICS.length];

    // Step 1: keyword + title
    const kwRaw = await callClaude(
      `Pick the best long-tail SEO keyword and blog title for: "${topicObj.topic}" on ${siteName} (${siteUrl}).
Low competition, high intent, not dominated by major travel publishers.
Respond ONLY with JSON: {"keyword":"...","title":"..."}`
    );
    const { keyword, title } = JSON.parse(kwRaw);

    // Step 2: full post
    const postRaw = await callClaude(
      `Write a 1200-word SEO blog post for ${siteName} (${siteUrl}) — free AI travel planner, 140 destinations, 17 languages.
KEYWORD: "${keyword}" | TITLE: "${title}"
Include: meta description, H1, intro with keyword, 4 H2 sections, one section mentioning ${siteName} naturally (link: https://${siteUrl}), FAQ (3 questions), conclusion with CTA.
Use HTML tags. Warm travel writer tone.
Respond ONLY with JSON: {"metaDescription":"...","title":"...","content":"...HTML...","excerpt":"...","tags":["...","...","...","...","..."]}`,
      4000
    );
    const post = JSON.parse(postRaw);

    // Step 3: publish to Ghost if configured
    let publishResult = { mode: "preview", message: "Ghost not configured — post ready to copy" };
    if (process.env.GHOST_URL && process.env.GHOST_ADMIN_API_KEY) {
      const [id, secret] = process.env.GHOST_ADMIN_API_KEY.split(":");
      const crypto = require("crypto");
      const now = Math.floor(Date.now()/1000);
      const b64 = s => Buffer.from(s).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
      const hdr = b64(JSON.stringify({alg:"HS256",typ:"JWT",kid:id}));
      const pld = b64(JSON.stringify({iat:now,exp:now+300,aud:"/admin/"}));
      const sig = crypto.createHmac("sha256",Buffer.from(secret,"hex")).update(`${hdr}.${pld}`).digest("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
      const jwt = `${hdr}.${pld}.${sig}`;
      const gr = await fetch(`${process.env.GHOST_URL}/ghost/api/admin/posts/`, {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Ghost ${jwt}`},
        body:JSON.stringify({posts:[{title:post.title,html:post.content,custom_excerpt:post.excerpt,meta_description:post.metaDescription,tags:(post.tags||[]).map(t=>({name:t})),status:"published"}]})
      });
      if (gr.ok) { const gd=await gr.json(); publishResult={mode:"published",postUrl:gd.posts[0].url}; }
    }

    return { statusCode:200, headers, body: JSON.stringify({ success:true, topic:topicObj.topic, keyword, title, publishResult, post, generatedAt:new Date().toISOString() }) };
  } catch(err) {
    return { statusCode:500, headers, body: JSON.stringify({ error:err.message }) };
  }
};
