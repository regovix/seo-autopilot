// netlify/functions/publish-to-ghost.js
// Publishes a generated post to Ghost CMS via Admin API

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
    const { post, publishImmediately = false } = JSON.parse(
      event.body || "{}"
    );

    if (!post) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "post object is required" }),
      };
    }

    const GHOST_URL = process.env.GHOST_URL;
    const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY;

    if (!GHOST_URL || !GHOST_ADMIN_API_KEY) {
      // If Ghost not configured, return the post data for manual use
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          mode: "preview",
          message:
            "Ghost CMS not configured. Post ready for manual publishing.",
          post,
        }),
      };
    }

    // Ghost Admin API uses JWT — split the key
    const [id, secret] = GHOST_ADMIN_API_KEY.split(":");
    const jwt = await generateGhostJWT(id, secret);

    const ghostPost = {
      title: post.title,
      html: post.content,
      custom_excerpt: post.excerpt,
      meta_description: post.metaDescription,
      tags: (post.tags || []).map((t) => ({ name: t })),
      status: publishImmediately ? "published" : "draft",
      published_at: publishImmediately ? new Date().toISOString() : null,
    };

    const response = await fetch(`${GHOST_URL}/ghost/api/admin/posts/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Ghost ${jwt}`,
      },
      body: JSON.stringify({ posts: [ghostPost] }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ghost API error: ${response.status} — ${errText}`);
    }

    const data = await response.json();
    const published = data.posts[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        mode: "published",
        postId: published.id,
        postUrl: published.url,
        status: published.status,
        title: published.title,
      }),
    };
  } catch (err) {
    console.error("publish-to-ghost error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// Generate a Ghost Admin API JWT token
async function generateGhostJWT(id, secret) {
  // Ghost uses HS256 JWT — build manually to avoid heavy jwt library
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const payload = base64url(
    JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" })
  );
  const signingInput = `${header}.${payload}`;

  // Use Node crypto for HMAC-SHA256
  const crypto = require("crypto");
  const keyBuffer = Buffer.from(secret, "hex");
  const sig = crypto
    .createHmac("sha256", keyBuffer)
    .update(signingInput)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${signingInput}.${sig}`;
}

function base64url(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
